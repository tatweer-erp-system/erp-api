import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import { TokenCacheService } from './token-cache.service';
import { LoginDto } from '../dto/login.dto';
import { JwtPayload } from '@/common/types/request.types';
import { LoginResponse, SessionInfo } from '../interfaces/auth.interface';
import { resolvePermissions } from '@/common/constants/permissions';

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
    private readonly tokenCacheService: TokenCacheService,
  ) {}

  /**
   * Tenant-less login: looks up the user's tenant from public.user_tenant_mappings.
   */
  async loginByEmail(dto: LoginDto, ip?: string, userAgent?: string): Promise<LoginResponse> {
    const shared = this.tenantSequelizeService.getSharedSequelize();

    // Look up tenant for this email
    const mappings = (await shared.query(
      `SELECT tenant_slug, user_id FROM public.user_tenant_mappings
       WHERE email = :email LIMIT 1`,
      { replacements: { email: dto.email }, type: 'SELECT' as any },
    )) as any[];

    const mapping = mappings?.[0];
    if (!mapping?.tenant_slug) {
      throw new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
    }

    return this.login(mapping.tenant_slug, dto, ip, userAgent);
  }

  /**
   * Tenant-scoped login: validates password and returns full login response.
   */
  async login(
    tenantSlug: string,
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Find user by email
    const users = (await sequelize.query(
      `SELECT id, email, password_hash, first_name, last_name, is_active,
              failed_login_attempts, locked_until, avatar_url, preferred_lang,
              role, extra_permissions, revoked_permissions
       FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1`,
      { replacements: { email: dto.email }, type: 'SELECT' as any },
    )) as any[];

    const user = users?.[0];
    if (!user?.id) {
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

    // Resolve user role — prefer the direct `role` column, fallback to user_roles join
    let userRole = user.role;
    if (!userRole) {
      const roles = await this.getUserRoles(sequelize, user.id);
      userRole = roles[0] || 'employee';
    }
    const normalizedRole = userRole.toLowerCase();

    // Resolve permissions via RBAC + ABAC
    const extraPermissions: string[] = user.extra_permissions || [];
    const revokedPermissions: string[] = user.revoked_permissions || [];
    const permissions = resolvePermissions(normalizedRole, extraPermissions, revokedPermissions);

    // Log successful login
    await this.logSecurityEvent(sequelize, {
      eventType: 'login',
      userId: user.id,
      tenantSlug,
      ipAddress: ip,
      userAgent,
    });

    // Fetch tenant info
    const tenantInfo = await this.fetchTenantInfo(tenantSlug);

    // Fetch branches
    const branchList = await this.fetchBranches(sequelize);

    // Generate token pair
    const family = uuidv4();
    const tokenPair = await this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: normalizedRole,
        roles: [normalizedRole],
      },
      tenantSlug,
      sequelize,
      ip,
      userAgent,
      family,
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url || null,
        preferredLang: user.preferred_lang || 'en',
        role: normalizedRole,
        permissions,
      },
      tenant: tenantInfo,
      branches: branchList,
    };
  }

  async refreshTokens(
    userId: string,
    tenantSlug: string,
    rawRefreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Find all active tokens for this user and match by bcrypt compare
    const activeTokens = (await sequelize.query(
      `SELECT id, token_hash, family, user_id, revoked
       FROM refresh_tokens
       WHERE user_id = :userId AND revoked = false AND expires_at > NOW()`,
      { replacements: { userId }, type: 'SELECT' as any },
    )) as any[];

    let matchedToken: any = null;

    for (const token of activeTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, token.token_hash);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      // Check if this token was already revoked (potential reuse attack)
      const allUserTokens = (await sequelize.query(
        `SELECT id, token_hash, family, user_id, revoked
         FROM refresh_tokens WHERE user_id = :userId`,
        { replacements: { userId }, type: 'SELECT' as any },
      )) as any[];

      for (const token of allUserTokens) {
        const isMatch = await bcrypt.compare(rawRefreshToken, token.token_hash);
        if (isMatch && token.revoked) {
          this.logger.warn(
            `Token reuse detected for user ${userId}, family ${token.family}. Revoking entire family.`,
          );
          await sequelize.query(
            `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW()
             WHERE family = :family AND revoked = false`,
            { replacements: { family: token.family } },
          );

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
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = :id`,
      { replacements: { id: matchedToken.id } },
    );

    // Fetch user data
    const users = (await sequelize.query(
      `SELECT id, email, first_name, last_name, is_active, avatar_url, preferred_lang,
              role, extra_permissions, revoked_permissions
       FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
      { replacements: { id: userId }, type: 'SELECT' as any },
    )) as any[];

    const user = users?.[0];
    if (!user?.id || !user.is_active) {
      throw new UnauthorizedException('AUTH.ACCOUNT_DISABLED');
    }

    let userRole = user.role;
    if (!userRole) {
      const roles = await this.getUserRoles(sequelize, user.id);
      userRole = roles[0] || 'employee';
    }
    const normalizedRole = userRole.toLowerCase();
    const extraPermissions: string[] = user.extra_permissions || [];
    const revokedPermissions: string[] = user.revoked_permissions || [];
    const permissions = resolvePermissions(normalizedRole, extraPermissions, revokedPermissions);

    const tenantInfo = await this.fetchTenantInfo(tenantSlug);
    const branchList = await this.fetchBranches(sequelize);

    // Create new token in same family
    const tokenPair = await this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: normalizedRole,
        roles: [normalizedRole],
      },
      tenantSlug,
      sequelize,
      ip,
      userAgent,
      matchedToken.family,
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url || null,
        preferredLang: user.preferred_lang || 'en',
        role: normalizedRole,
        permissions,
      },
      tenant: tenantInfo,
      branches: branchList,
    };
  }

  async logout(tenantSlug: string, userId: string, sessionId?: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (sessionId) {
      await sequelize.query(
        `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = :id`,
        { replacements: { id: sessionId } },
      );
    } else {
      await sequelize.query(
        `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW()
         WHERE user_id = :userId AND revoked = false`,
        { replacements: { userId } },
      );
    }
    await this.tokenCacheService.revokeAllUserTokens(userId);
  }

  async getSessions(tenantSlug: string, userId: string): Promise<SessionInfo[]> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const sessions = (await sequelize.query(
      `SELECT id, ip_address, user_agent, created_at, expires_at
       FROM refresh_tokens
       WHERE user_id = :userId AND revoked = false AND expires_at > NOW()
       ORDER BY created_at DESC`,
      { replacements: { userId }, type: 'SELECT' as any },
    )) as any[];

    return sessions.map((session: any) => ({
      id: session.id,
      ipAddress: session.ip_address || '',
      userAgent: session.user_agent || '',
      lastSeenAt: session.created_at,
      createdAt: session.created_at,
      isCurrent: false,
    }));
  }

  async revokeSession(tenantSlug: string, userId: string, sessionId: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const sessions = (await sequelize.query(
      `SELECT id, user_id FROM refresh_tokens WHERE id = :id LIMIT 1`,
      { replacements: { id: sessionId }, type: 'SELECT' as any },
    )) as any[];

    const session = sessions?.[0];
    if (!session || session.user_id !== userId) {
      throw new UnauthorizedException('AUTH.SESSION_NOT_FOUND');
    }
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = :id`,
      { replacements: { id: sessionId } },
    );
  }

  async revokeAllSessions(tenantSlug: string, userId: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW()
       WHERE user_id = :userId AND revoked = false`,
      { replacements: { userId } },
    );
    await this.tokenCacheService.revokeAllUserTokens(userId);
  }

  async getUserRoles(sequelize: any, userId: string): Promise<string[]> {
    const rows = (await sequelize.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId AND r.deleted_at IS NULL`,
      { replacements: { userId }, type: 'SELECT' as any },
    )) as any[];
    return rows.map((r: any) => r.name);
  }

  async generateTokenPair(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      roles: string[];
    },
    tenantSlug: string,
    sequelize: any,
    ip?: string,
    userAgent?: string,
    family?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenFamily = family || uuidv4();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantSlug,
      role: user.role,
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

    // Store in database via raw SQL
    await sequelize.query(
      `INSERT INTO refresh_tokens (id, user_id, tenant_slug, token_hash, family, expires_at, ip_address, user_agent, revoked, created_at)
       VALUES (:id, :userId, :tenantSlug, :tokenHash, :family, :expiresAt, :ip, :userAgent, false, NOW())`,
      {
        replacements: {
          id: uuidv4(),
          userId: user.id,
          tenantSlug,
          tokenHash,
          family: tokenFamily,
          expiresAt,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
        },
      },
    );

    // Also cache for fast lookup
    await this.tokenCacheService.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async fetchTenantInfo(
    tenantSlug: string,
  ): Promise<{ slug: string; name: string; logo: string | null }> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    const tenants = (await shared.query(
      `SELECT name, slug, settings FROM public.tenants
       WHERE slug = :slug AND deleted_at IS NULL LIMIT 1`,
      { replacements: { slug: tenantSlug }, type: 'SELECT' as any },
    )) as any[];

    const tenant = tenants?.[0];
    return {
      slug: tenant?.slug || tenantSlug,
      name: tenant?.name || tenantSlug,
      logo: tenant?.settings?.logo || null,
    };
  }

  private async fetchBranches(
    sequelize: any,
  ): Promise<{ id: string; name: string; code: string; isDefault: boolean }[]> {
    const branches = (await sequelize.query(
      `SELECT id, name, code, is_default FROM branches
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY is_default DESC, name ASC`,
      { type: 'SELECT' as any },
    )) as any[];

    return (branches || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      isDefault: b.is_default,
    }));
  }

  private calculateExpiry(duration: string): Date {
    const now = Date.now();
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
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
