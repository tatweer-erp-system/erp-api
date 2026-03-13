import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  // ── Public/shared schema queries ────────────────────────────────────────────

  async findTenantMappingByEmail(email: string) {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    const [mappings] = await shared.query(
      `SELECT utm."tenantSlug", utm."userId", t.id as "tenantId"
       FROM public.user_tenant_mappings utm
       JOIN public.tenants t ON t.slug = utm."tenantSlug"
       WHERE utm.email = :email LIMIT 1`,
      { replacements: { email } },
    );

    return (mappings as any[])?.[0] ?? null;
  }

  async resolveTenantIdBySlug(tenantSlug: string): Promise<string | null> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await shared.query(
      `SELECT id FROM public.tenants WHERE slug = :slug AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { slug: tenantSlug } },
    );
    const tenant = (rows as any[])?.[0];
    return tenant?.id ?? null;
  }

  async fetchTenantInfo(
    tenantId: string,
  ): Promise<{ slug: string; name: string; logo: string | null }> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    const [tenants] = await shared.query(
      `SELECT name, slug, settings FROM public.tenants
       WHERE id = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { tenantId } },
    );

    const tenant = (tenants as any[])?.[0];
    const rawName = tenant?.name;
    const name =
      typeof rawName === 'object' && rawName !== null
        ? rawName.en || rawName.ar || ''
        : rawName || '';
    return {
      slug: tenant?.slug || '',
      name,
      logo: tenant?.settings?.logo || null,
    };
  }

  // ── Tenant-scoped user queries ──────────────────────────────────────────────

  async findUserByEmailForLogin(tenantId: string, email: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [users] = await sequelize.query(
      `SELECT id, email, "passwordHash", "firstName", "lastName", "isActive",
              "failedLoginAttempts", "lockedUntil", "avatarUrl", "preferredLang",
              "extraPermissions", "revokedPermissions"
       FROM users WHERE email = :email AND "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { email, tenantId } },
    );

    return (users as any[])?.[0] ?? null;
  }

  async findUserByIdForAuth(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [users] = await sequelize.query(
      `SELECT id, email, "firstName", "lastName", "isActive", "avatarUrl", "preferredLang",
              "extraPermissions", "revokedPermissions"
       FROM users WHERE id = :id AND "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { id: userId, tenantId } },
    );

    return (users as any[])?.[0] ?? null;
  }

  async incrementFailedAttempts(
    tenantId: string,
    userId: string,
    failedAttempts: number,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE users SET "failedLoginAttempts" = :attempts WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { attempts: failedAttempts, id: userId, tenantId } },
    );
  }

  async lockAccount(
    tenantId: string,
    userId: string,
    failedAttempts: number,
    lockUntil: Date,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE users SET "failedLoginAttempts" = :attempts, "lockedUntil" = :lockUntil WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { attempts: failedAttempts, lockUntil, id: userId, tenantId } },
    );
  }

  async resetFailedAttemptsAndSetLastLogin(tenantId: string, userId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE users SET "failedLoginAttempts" = 0, "lockedUntil" = NULL, "lastLoginAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id: userId, tenantId } },
    );
  }

  /**
   * Get user role names (legacy compatibility).
   */
  async getUserRoles(tenantId: string, userId: string): Promise<string[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON ur."roleId" = r.id
       WHERE ur."userId" = :userId AND r."tenantId" = :tenantId AND r."deletedAt" IS NULL`,
      { replacements: { userId, tenantId } },
    );
    return (rows as any[]).map((r: any) => r.name);
  }

  /**
   * Get user roles with both IDs and names.
   */
  async getUserRolesWithIds(
    tenantId: string,
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT r.id, r.name FROM roles r
       JOIN user_roles ur ON ur."roleId" = r.id
       WHERE ur."userId" = :userId AND r."tenantId" = :tenantId AND r."deletedAt" IS NULL
       ORDER BY r.name ASC`,
      { replacements: { userId, tenantId } },
    );
    return (rows as any[]).map((r: any) => ({ id: r.id, name: r.name }));
  }

  /**
   * Get all permissions (as "module:action" strings) for given role IDs
   * via the rolePermissions junction table.
   */
  async getRolePermissions(tenantId: string, roleIds: string[]): Promise<string[]> {
    if (!roleIds.length) return [];

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT DISTINCT CONCAT(p.module, ':', p.action) as permission
       FROM "rolePermissions" rp
       JOIN permissions p ON p.id = rp."permissionId" AND p."deletedAt" IS NULL
       WHERE rp."roleId" IN (:roleIds) AND rp."tenantId" = :tenantId`,
      { replacements: { roleIds, tenantId } },
    );

    return (rows as any[]).map((r: any) => r.permission);
  }

  // ── Branches ────────────────────────────────────────────────────────────────

  async fetchBranches(
    tenantId: string,
  ): Promise<{ id: string; name: string; code: string; isDefault: boolean }[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [branches] = await sequelize.query(
      `SELECT id, name, code, "isMain" FROM branches
       WHERE "tenantId" = :tenantId AND "isActive" = true AND "deletedAt" IS NULL
       ORDER BY "isMain" DESC, name ASC`,
      { replacements: { tenantId } },
    );

    return ((branches as any[]) || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      isDefault: b.isMain,
    }));
  }

  // ── Refresh tokens ──────────────────────────────────────────────────────────

  async findActiveRefreshTokens(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, "tokenHash", family, "userId", revoked
       FROM refresh_tokens
       WHERE "userId" = :userId AND "tenantId" = :tenantId AND revoked = false AND "expiresAt" > NOW()`,
      { replacements: { userId, tenantId } },
    );
    return rows as any[];
  }

  async findAllRefreshTokensForUser(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, "tokenHash", family, "userId", revoked
       FROM refresh_tokens WHERE "userId" = :userId AND "tenantId" = :tenantId`,
      { replacements: { userId, tenantId } },
    );
    return rows as any[];
  }

  async revokeRefreshToken(tenantId: string, tokenId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, "revokedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id: tokenId, tenantId } },
    );
  }

  async revokeTokenFamily(tenantId: string, family: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, "revokedAt" = NOW()
       WHERE family = :family AND "tenantId" = :tenantId AND revoked = false`,
      { replacements: { family, tenantId } },
    );
  }

  async revokeAllUserTokens(tenantId: string, userId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, "revokedAt" = NOW()
       WHERE "userId" = :userId AND "tenantId" = :tenantId AND revoked = false`,
      { replacements: { userId, tenantId } },
    );
  }

  async createRefreshToken(
    tenantId: string,
    data: {
      userId: string;
      tenantSlug: string;
      tokenHash: string;
      family: string;
      expiresAt: Date;
      ip?: string | null;
      userAgent?: string | null;
    },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO refresh_tokens (id, "userId", "tenantId", "tenantSlug", "tokenHash", family, "expiresAt", "ipAddress", "userAgent", revoked, "createdAt")
       VALUES (:id, :userId, :tenantId, :tenantSlug, :tokenHash, :family, :expiresAt, :ip, :userAgent, false, NOW())`,
      {
        replacements: {
          id: uuidv4(),
          userId: data.userId,
          tenantId,
          tenantSlug: data.tenantSlug,
          tokenHash: data.tokenHash,
          family: data.family,
          expiresAt: data.expiresAt,
          ip: data.ip ?? null,
          userAgent: data.userAgent ?? null,
        },
      },
    );
  }

  // ── Sessions ────────────────────────────────────────────────────────────────

  async getActiveSessions(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, "ipAddress", "userAgent", "createdAt", "expiresAt"
       FROM refresh_tokens
       WHERE "userId" = :userId AND "tenantId" = :tenantId AND revoked = false AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC`,
      { replacements: { userId, tenantId } },
    );
    return rows as any[];
  }

  async findSessionById(tenantId: string, sessionId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [sessions] = await sequelize.query(
      `SELECT id, "userId" FROM refresh_tokens WHERE id = :id AND "tenantId" = :tenantId LIMIT 1`,
      { replacements: { id: sessionId, tenantId } },
    );

    return (sessions as any[])?.[0] ?? null;
  }

  // ── Security events ─────────────────────────────────────────────────────────

  async logSecurityEvent(
    tenantId: string,
    data: {
      eventType: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO security_events (id, "eventType", "userId", "tenantId", "ipAddress", "userAgent", metadata, "createdAt")
       VALUES (:id, :eventType, :userId, :tenantId, :ipAddress, :userAgent, :metadata, NOW())`,
      {
        replacements: {
          id: uuidv4(),
          eventType: data.eventType,
          userId: data.userId || null,
          tenantId,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      },
    );
  }
}
