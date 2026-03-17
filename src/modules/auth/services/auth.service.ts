import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';
import { AuthRepository } from '@/database/sql/repositories/auth.repository';
import { JwtSharedService } from '@/shared/services/jwt-shared.service';
import { TokenCacheSharedService } from '@/shared/services/token-cache-shared.service';
import { LoginDto } from '../dto/login.dto';
import { JwtPayload } from '@/common/types/request.types';
import { LoginResponse, SessionInfo } from '../interfaces/auth.interface';
import { resolvePermissions } from '@/common/constants/permissions';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtSharedService: JwtSharedService,
    private readonly authRepository: AuthRepository,
    private readonly tokenCacheService: TokenCacheSharedService,
  ) {}

  /**
   * Tenant-less login: looks up the user's tenant from public.user_tenant_mappings.
   */
  async loginByEmail(dto: LoginDto, ip?: string, userAgent?: string): Promise<LoginResponse> {
    const mapping = await this.authRepository.findTenantMappingByEmail(dto.email);

    if (!mapping?.tenantSlug || !mapping?.tenantId) {
      throw new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
    }

    return this.login(mapping.tenantSlug, mapping.tenantId, dto, ip, userAgent);
  }

  /**
   * Tenant-scoped login by slug: resolves tenantId from slug, then delegates to login().
   */
  async loginBySlug(
    tenantSlug: string,
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const tenantId = await this.authRepository.resolveTenantIdBySlug(tenantSlug);

    if (!tenantId) {
      throw new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
    }

    return this.login(tenantSlug, tenantId, dto, ip, userAgent);
  }

  /**
   * Tenant-scoped login: validates password and returns full login response.
   */
  async login(
    tenantSlug: string,
    tenantId: string,
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    // Find user by email
    const user = await this.authRepository.findUserByEmailForLogin(tenantId, dto.email);

    if (!user?.id) {
      await this.safeLogSecurityEvent(tenantId, {
        eventType: 'failed_login',
        ipAddress: ip,
        userAgent,
        metadata: { email: dto.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await this.safeLogSecurityEvent(tenantId, {
        eventType: 'login_attempt_while_locked',
        userId: user.id,
        ipAddress: ip,
        userAgent,
      });
      throw new UnauthorizedException('AUTH.ACCOUNT_LOCKED');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('AUTH.ACCOUNT_DISABLED');
    }

    // Validate password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

      if (shouldLock) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await this.authRepository.lockAccount(tenantId, user.id, failedAttempts, lockUntil);

        await this.safeLogSecurityEvent(tenantId, {
          eventType: 'lockout',
          userId: user.id,
          ipAddress: ip,
          userAgent,
          metadata: { failedAttempts, lockedUntilMinutes: LOCK_DURATION_MINUTES },
        });

        throw new UnauthorizedException('AUTH.ACCOUNT_LOCKED');
      } else {
        await this.authRepository.incrementFailedAttempts(tenantId, user.id, failedAttempts);

        await this.safeLogSecurityEvent(tenantId, {
          eventType: 'failed_login',
          userId: user.id,
          ipAddress: ip,
          userAgent,
          metadata: { failedAttempts, remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts },
        });

        throw new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
      }
    }

    // Success: reset failed attempts, set last login
    await this.authRepository.resetFailedAttemptsAndSetLastLogin(tenantId, user.id);

    // Resolve user roles (names and IDs) from user_roles junction
    const userRoles = await this.authRepository.getUserRolesWithIds(tenantId, user.id);
    const roleNames = userRoles.map((r) => r.name.toLowerCase());
    const roleIds = userRoles.map((r) => r.id);

    // Resolve permissions via DB-driven RBAC
    const rolePermissions = await this.authRepository.getRolePermissions(tenantId, roleIds);
    const extraPermissions: string[] = user.extraPermissions || [];
    const revokedPermissions: string[] = user.revokedPermissions || [];
    const permissions = resolvePermissions(rolePermissions, extraPermissions, revokedPermissions);

    // Log successful login
    await this.safeLogSecurityEvent(tenantId, {
      eventType: 'login',
      userId: user.id,
      ipAddress: ip,
      userAgent,
    });

    // Fetch tenant info
    const tenantInfo = await this.authRepository.fetchTenantInfo(tenantId);

    // Fetch branches
    const branchList = await this.authRepository.fetchBranches(tenantId, user.id);

    // Generate token pair
    const family = uuidv7();
    const tokenPair = await this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstNameEn: user.firstNameEn,
        firstNameAr: user.firstNameAr,
        lastNameEn: user.lastNameEn,
        lastNameAr: user.lastNameAr,
        roles: roleNames,
      },
      tenantSlug,
      tenantId,
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
        firstNameEn: user.firstNameEn,
        firstNameAr: user.firstNameAr,
        lastNameEn: user.lastNameEn,
        lastNameAr: user.lastNameAr,
        avatarUrl: user.avatarUrl || null,
        preferredLang: user.preferredLang || 'en',
        roles: userRoles.map((r) => ({ id: r.id, name: r.name })),
        permissions,
      },
      tenant: tenantInfo,
      branches: branchList,
    };
  }

  async refreshTokens(
    userId: string,
    tenantSlug: string,
    tenantId: string,
    rawRefreshToken: string,
    ip?: string,
    userAgent?: string,
    branchId?: string,
  ): Promise<LoginResponse> {
    // Find all active tokens for this user and match by bcrypt compare
    const activeTokens = await this.authRepository.findActiveRefreshTokens(tenantId, userId);

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
      const allUserTokens = await this.authRepository.findAllRefreshTokensForUser(tenantId, userId);

      for (const token of allUserTokens) {
        const isMatch = await bcrypt.compare(rawRefreshToken, token.tokenHash);
        if (isMatch && token.revoked) {
          this.logger.warn(
            `Token reuse detected for user ${userId}, family ${token.family}. Revoking entire family.`,
          );
          await this.authRepository.revokeTokenFamily(tenantId, token.family);

          await this.safeLogSecurityEvent(tenantId, {
            eventType: 'token_reuse',
            userId,
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
    await this.authRepository.revokeRefreshToken(tenantId, matchedToken.id);

    // Fetch user data
    const user = await this.authRepository.findUserByIdForAuth(tenantId, userId);

    if (!user?.id || !user.isActive) {
      throw new UnauthorizedException('AUTH.ACCOUNT_DISABLED');
    }

    // Resolve user roles from user_roles junction
    const userRoles = await this.authRepository.getUserRolesWithIds(tenantId, user.id);
    const roleNames = userRoles.map((r) => r.name.toLowerCase());
    const roleIds = userRoles.map((r) => r.id);

    // Resolve permissions via DB-driven RBAC
    const rolePermissions = await this.authRepository.getRolePermissions(tenantId, roleIds);
    const extraPermissions: string[] = user.extraPermissions || [];
    const revokedPermissions: string[] = user.revokedPermissions || [];
    const permissions = resolvePermissions(rolePermissions, extraPermissions, revokedPermissions);

    const tenantInfo = await this.authRepository.fetchTenantInfo(tenantId);
    const branchList = await this.authRepository.fetchBranches(tenantId, user.id);

    // Create new token in same family — preserve branchId from original token
    const tokenPair = await this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstNameEn: user.firstNameEn,
        firstNameAr: user.firstNameAr,
        lastNameEn: user.lastNameEn,
        lastNameAr: user.lastNameAr,
        roles: roleNames,
      },
      tenantSlug,
      tenantId,
      ip,
      userAgent,
      matchedToken.family,
      branchId,
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstNameEn: user.firstNameEn,
        firstNameAr: user.firstNameAr,
        lastNameEn: user.lastNameEn,
        lastNameAr: user.lastNameAr,
        avatarUrl: user.avatarUrl || null,
        preferredLang: user.preferredLang || 'en',
        roles: userRoles.map((r) => ({ id: r.id, name: r.name })),
        permissions,
      },
      tenant: tenantInfo,
      branches: branchList,
    };
  }

  async logout(tenantId: string, userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.authRepository.revokeRefreshToken(tenantId, sessionId);
    } else {
      await this.authRepository.revokeAllUserTokens(tenantId, userId);
    }
    await this.tokenCacheService.revokeAllUserTokens(userId);
  }

  async getSessions(tenantId: string, userId: string): Promise<SessionInfo[]> {
    const sessions = await this.authRepository.getActiveSessions(tenantId, userId);

    return sessions.map((session: any) => ({
      id: session.id,
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      lastSeenAt: session.createdAt,
      createdAt: session.createdAt,
      isCurrent: false,
    }));
  }

  async revokeSession(tenantId: string, userId: string, sessionId: string): Promise<void> {
    const session = await this.authRepository.findSessionById(tenantId, sessionId);

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('AUTH.SESSION_NOT_FOUND');
    }
    await this.authRepository.revokeRefreshToken(tenantId, sessionId);
  }

  async revokeAllSessions(tenantId: string, userId: string): Promise<void> {
    await this.authRepository.revokeAllUserTokens(tenantId, userId);
    await this.tokenCacheService.revokeAllUserTokens(userId);
  }

  async getPinStatus(tenantId: string, userId: string): Promise<{ hasPin: boolean }> {
    const pinHash = await this.authRepository.getUserPinHash(tenantId, userId);
    return { hasPin: pinHash !== null };
  }

  async setPin(tenantId: string, userId: string, pin: string): Promise<void> {
    const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await this.authRepository.setUserPinHash(tenantId, userId, pinHash);
  }

  async verifyPin(tenantId: string, userId: string, pin: string): Promise<void> {
    const pinHash = await this.authRepository.getUserPinHash(tenantId, userId);

    if (!pinHash) {
      throw new BadRequestException(msg(ErrorMessages.USER_PIN_NOT_SET));
    }

    const isValid = await bcrypt.compare(pin, pinHash);

    if (!isValid) {
      throw new BadRequestException(msg(ErrorMessages.USER_PIN_INCORRECT));
    }
  }

  /**
   * Select a branch after login — validates access and re-issues tokens with branchId.
   */
  async selectBranch(
    userId: string,
    tenantSlug: string,
    tenantId: string,
    branchId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify user has access to this branch
    const branchList = await this.authRepository.fetchBranches(tenantId, userId);
    const branch = branchList.find((b: any) => b.id === branchId);

    if (!branch) {
      throw new ForbiddenException('AUTH.BRANCH_ACCESS_DENIED');
    }

    // Fetch user data for token generation
    const user = await this.authRepository.findUserByIdForAuth(tenantId, userId);
    if (!user?.id || !user.isActive) {
      throw new UnauthorizedException('AUTH.ACCOUNT_DISABLED');
    }

    const userRoles = await this.authRepository.getUserRolesWithIds(tenantId, user.id);
    const roleNames = userRoles.map((r) => r.name.toLowerCase());

    // Revoke existing tokens (branch-less tokens from login step)
    await this.authRepository.revokeAllUserTokens(tenantId, userId);
    await this.tokenCacheService.revokeAllUserTokens(userId);

    // Generate new token pair with branchId
    const family = uuidv7();
    const tokenPair = await this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstNameEn: user.firstNameEn,
        firstNameAr: user.firstNameAr,
        lastNameEn: user.lastNameEn,
        lastNameAr: user.lastNameAr,
        roles: roleNames,
      },
      tenantSlug,
      tenantId,
      ip,
      userAgent,
      family,
      branchId,
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    };
  }

  async generateTokenPair(
    user: {
      id: string;
      email: string;
      firstNameEn: string;
      firstNameAr: string;
      lastNameEn: string;
      lastNameAr: string;
      roles: string[];
    },
    tenantSlug: string,
    tenantId: string,
    ip?: string,
    userAgent?: string,
    family?: string,
    branchId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenFamily = family || uuidv7();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantSlug,
      tenantId,
      roles: user.roles,
      branchId,
    };

    const accessToken = this.jwtSharedService.signAccessToken(payload);
    const refreshToken = this.jwtSharedService.signRefreshToken(payload);

    // Hash refresh token for secure storage
    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);

    // Calculate expiry (default 7 days)
    const refreshExpiresIn = this.jwtSharedService.getRefreshExpiresIn();
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    // Store in database via repository
    await this.authRepository.createRefreshToken(tenantId, {
      userId: user.id,
      tenantSlug,
      tokenHash,
      family: tokenFamily,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });

    // Also cache for fast lookup
    await this.tokenCacheService.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

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

  private async safeLogSecurityEvent(
    tenantId: string,
    data: {
      eventType: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await this.authRepository.logSecurityEvent(tenantId, data);
    } catch (error) {
      this.logger.error('Failed to log security event', error);
    }
  }
}
