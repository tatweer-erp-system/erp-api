import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { AuthRepository } from './auth.repository';
import { TokenCacheService } from './token-cache.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/types/request.types';
import { TokenPair, SessionInfo } from './interfaces/auth.interface';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly authRepository: AuthRepository,
    private readonly tokenCacheService: TokenCacheService,
  ) {}

  async login(
    tenantSlug: string,
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Find user by email
    const [users] = await sequelize.query(
      `SELECT id, email, password_hash, first_name, last_name, is_active,
              failed_login_attempts, locked_until
       FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1`,
      { replacements: { email: dto.email }, type: 'SELECT' as any },
    );

    const user = (users as any[])?.[0] ?? (users as any);
    if (!user?.id) {
      // Log failed attempt for non-existent user
      await this.logSecurityEvent(sequelize, {
        eventType: 'failed_login',
        tenantSlug,
        ipAddress: ip,
        userAgent,
        metadata: { email: dto.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await this.logSecurityEvent(sequelize, {
        eventType: 'login_attempt_while_locked',
        userId: user.id,
        tenantSlug,
        ipAddress: ip,
        userAgent,
      });
      throw new UnauthorizedException('AUTH.ACCOUNT_LOCKED');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('AUTH.ACCOUNT_DISABLED');
    }

    // Validate password
    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!passwordValid) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

      if (shouldLock) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await sequelize.query(
          `UPDATE users SET failed_login_attempts = :attempts, locked_until = :lockUntil WHERE id = :id`,
          { replacements: { attempts: failedAttempts, lockUntil, id: user.id } },
        );

        await this.logSecurityEvent(sequelize, {
          eventType: 'lockout',
          userId: user.id,
          tenantSlug,
          ipAddress: ip,
          userAgent,
          metadata: { failedAttempts, lockedUntilMinutes: LOCK_DURATION_MINUTES },
        });

        throw new UnauthorizedException('AUTH.ACCOUNT_LOCKED');
      } else {
        await sequelize.query(`UPDATE users SET failed_login_attempts = :attempts WHERE id = :id`, {
          replacements: { attempts: failedAttempts, id: user.id },
        });

        await this.logSecurityEvent(sequelize, {
          eventType: 'failed_login',
          userId: user.id,
          tenantSlug,
          ipAddress: ip,
          userAgent,
          metadata: { failedAttempts, remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts },
        });

        throw new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
      }
    }

    // Success: reset failed attempts, set last login
    await sequelize.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = :id`,
      { replacements: { id: user.id } },
    );

    const roles = await this.getUserRoles(sequelize, user.id);

    // Log successful login
    await this.logSecurityEvent(sequelize, {
      eventType: 'login',
      userId: user.id,
      tenantSlug,
      ipAddress: ip,
      userAgent,
    });

    // Generate token pair with new family
    const family = uuidv4();
    return this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
      },
      tenantSlug,
      ip,
      userAgent,
      family,
    );
  }

  async refreshTokens(
    userId: string,
    tenantSlug: string,
    rawRefreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    // Find all active tokens for this user and match by bcrypt compare
    const activeTokens = await this.authRepository.findActiveTokensForUser(userId);
    let matchedToken: any = null;

    for (const token of activeTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, token.tokenHash);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      // Check if this token was already revoked (potential reuse attack)
      const allUserTokens = await this.authRepository.findAllRaw({
        where: { userId },
      });

      for (const token of allUserTokens) {
        const isMatch = await bcrypt.compare(rawRefreshToken, token.tokenHash);
        if (isMatch && token.revoked) {
          // TOKEN REUSE DETECTED - revoke entire family
          this.logger.warn(
            `Token reuse detected for user ${userId}, family ${token.family}. Revoking entire family.`,
          );
          await this.authRepository.revokeFamily(token.family);

          const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
          await this.logSecurityEvent(sequelize, {
            eventType: 'token_reuse',
            userId,
            tenantSlug,
            ipAddress: ip,
            userAgent,
            metadata: { family: token.family },
          });

          throw new UnauthorizedException('AUTH.TOKEN_REUSE_DETECTED');
        }
      }

      throw new UnauthorizedException('AUTH.INVALID_REFRESH_TOKEN');
    }

    // Revoke the old token
    await this.authRepository.revokeToken(matchedToken.id);

    // Fetch user data
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [users] = await sequelize.query(
      `SELECT id, email, first_name, last_name, is_active FROM users
       WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
      { replacements: { id: userId }, type: 'SELECT' as any },
    );

    const user = (users as any[])?.[0] ?? (users as any);
    if (!user?.id || !user.is_active) {
      throw new UnauthorizedException('AUTH.ACCOUNT_DISABLED');
    }

    const roles = await this.getUserRoles(sequelize, user.id);

    // Create new token in same family
    return this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
      },
      tenantSlug,
      ip,
      userAgent,
      matchedToken.family,
    );
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.authRepository.revokeToken(sessionId);
    } else {
      await this.authRepository.revokeAllForUser(userId);
    }
    await this.tokenCacheService.revokeAllUserTokens(userId);
  }

  async getSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.authRepository.getActiveSessions(userId);
    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      lastSeenAt: session.createdAt,
      createdAt: session.createdAt,
      isCurrent: false, // caller can set this based on current token
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.authRepository.findByIdOrNull(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('AUTH.SESSION_NOT_FOUND');
    }
    await this.authRepository.revokeToken(sessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.authRepository.revokeAllForUser(userId);
    await this.tokenCacheService.revokeAllUserTokens(userId);
  }

  async getUserRoles(sequelize: any, userId: string): Promise<string[]> {
    const [rows] = await sequelize.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId AND r.deleted_at IS NULL`,
      { replacements: { userId }, type: 'SELECT' as any },
    );
    return (rows as any[]).map((r: any) => r.name);
  }

  async generateTokenPair(
    user: { id: string; email: string; firstName: string; lastName: string; roles: string[] },
    tenantSlug: string,
    ip?: string,
    userAgent?: string,
    family?: string,
  ): Promise<TokenPair> {
    const tokenFamily = family || uuidv4();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantSlug,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    // Hash refresh token for secure storage
    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);

    // Calculate expiry (default 7 days)
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    // Store in database
    await this.authRepository.createToken({
      userId: user.id,
      tenantSlug,
      tokenHash,
      family: tokenFamily,
      expiresAt,
      ipAddress: ip,
      userAgent,
    });

    // Also cache for fast lookup
    await this.tokenCacheService.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    };
  }

  private calculateExpiry(duration: string): Date {
    const now = Date.now();
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000); // default 7 days
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(now + value * (multipliers[unit] || multipliers['d']));
  }

  private async logSecurityEvent(
    sequelize: any,
    data: {
      eventType: string;
      userId?: string;
      tenantSlug?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await sequelize.query(
        `INSERT INTO security_events (id, event_type, user_id, tenant_slug, ip_address, user_agent, metadata, created_at)
         VALUES (:id, :eventType, :userId, :tenantSlug, :ipAddress, :userAgent, :metadata, NOW())`,
        {
          replacements: {
            id: uuidv4(),
            eventType: data.eventType,
            userId: data.userId || null,
            tenantSlug: data.tenantSlug || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          },
        },
      );
    } catch (error) {
      this.logger.error('Failed to log security event', error);
    }
  }
}
