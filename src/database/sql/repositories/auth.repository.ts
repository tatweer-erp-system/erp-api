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
      `SELECT utm.tenant_slug, utm.user_id, t.id as tenant_id
       FROM public.user_tenant_mappings utm
       JOIN public.tenants t ON t.slug = utm.tenant_slug
       WHERE utm.email = :email LIMIT 1`,
      { replacements: { email } },
    );

    return (mappings as any[])?.[0] ?? null;
  }

  async resolveTenantIdBySlug(tenantSlug: string): Promise<string | null> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await shared.query(
      `SELECT id FROM public.tenants WHERE slug = :slug AND deleted_at IS NULL LIMIT 1`,
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
       WHERE id = :tenantId AND deleted_at IS NULL LIMIT 1`,
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
      `SELECT id, email, password_hash, first_name, last_name, is_active,
              failed_login_attempts, locked_until, avatar_url, preferred_lang,
              extra_permissions, revoked_permissions
       FROM users WHERE email = :email AND tenant_id = :tenantId AND deleted_at IS NULL LIMIT 1`,
      { replacements: { email, tenantId } },
    );

    return (users as any[])?.[0] ?? null;
  }

  async findUserByIdForAuth(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [users] = await sequelize.query(
      `SELECT id, email, first_name, last_name, is_active, avatar_url, preferred_lang,
              extra_permissions, revoked_permissions
       FROM users WHERE id = :id AND tenant_id = :tenantId AND deleted_at IS NULL LIMIT 1`,
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
      `UPDATE users SET failed_login_attempts = :attempts WHERE id = :id AND tenant_id = :tenantId`,
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
      `UPDATE users SET failed_login_attempts = :attempts, locked_until = :lockUntil WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { attempts: failedAttempts, lockUntil, id: userId, tenantId } },
    );
  }

  async resetFailedAttemptsAndSetLastLogin(tenantId: string, userId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = :id AND tenant_id = :tenantId`,
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
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId AND r.tenant_id = :tenantId AND r.deleted_at IS NULL`,
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
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId AND r.tenant_id = :tenantId AND r.deleted_at IS NULL
       ORDER BY r.name ASC`,
      { replacements: { userId, tenantId } },
    );
    return (rows as any[]).map((r: any) => ({ id: r.id, name: r.name }));
  }

  /**
   * Get all permissions (as "module:action" strings) for given role IDs
   * via the role_permissions junction table.
   */
  async getRolePermissions(tenantId: string, roleIds: string[]): Promise<string[]> {
    if (!roleIds.length) return [];

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT DISTINCT CONCAT(p.module, ':', p.action) as permission
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
       WHERE rp.role_id IN (:roleIds) AND rp.tenant_id = :tenantId`,
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
      `SELECT id, name, code, is_main FROM branches
       WHERE tenant_id = :tenantId AND is_active = true AND deleted_at IS NULL
       ORDER BY is_main DESC, name ASC`,
      { replacements: { tenantId } },
    );

    return ((branches as any[]) || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      isDefault: b.is_main,
    }));
  }

  // ── Refresh tokens ──────────────────────────────────────────────────────────

  async findActiveRefreshTokens(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, token_hash, family, user_id, revoked
       FROM refresh_tokens
       WHERE user_id = :userId AND tenant_id = :tenantId AND revoked = false AND expires_at > NOW()`,
      { replacements: { userId, tenantId } },
    );
    return rows as any[];
  }

  async findAllRefreshTokensForUser(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, token_hash, family, user_id, revoked
       FROM refresh_tokens WHERE user_id = :userId AND tenant_id = :tenantId`,
      { replacements: { userId, tenantId } },
    );
    return rows as any[];
  }

  async revokeRefreshToken(tenantId: string, tokenId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id: tokenId, tenantId } },
    );
  }

  async revokeTokenFamily(tenantId: string, family: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW()
       WHERE family = :family AND tenant_id = :tenantId AND revoked = false`,
      { replacements: { family, tenantId } },
    );
  }

  async revokeAllUserTokens(tenantId: string, userId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW()
       WHERE user_id = :userId AND tenant_id = :tenantId AND revoked = false`,
      { replacements: { userId, tenantId } },
    );
  }

  async createRefreshToken(
    tenantId: string,
    data: {
      userId: string;
      tokenHash: string;
      family: string;
      expiresAt: Date;
      ip?: string | null;
      userAgent?: string | null;
    },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, family, expires_at, ip_address, user_agent, revoked, created_at)
       VALUES (:id, :userId, :tenantId, :tokenHash, :family, :expiresAt, :ip, :userAgent, false, NOW())`,
      {
        replacements: {
          id: uuidv4(),
          userId: data.userId,
          tenantId,
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
      `SELECT id, ip_address, user_agent, created_at, expires_at
       FROM refresh_tokens
       WHERE user_id = :userId AND tenant_id = :tenantId AND revoked = false AND expires_at > NOW()
       ORDER BY created_at DESC`,
      { replacements: { userId, tenantId } },
    );
    return rows as any[];
  }

  async findSessionById(tenantId: string, sessionId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [sessions] = await sequelize.query(
      `SELECT id, user_id FROM refresh_tokens WHERE id = :id AND tenant_id = :tenantId LIMIT 1`,
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
      `INSERT INTO security_events (id, event_type, user_id, tenant_id, ip_address, user_agent, metadata, created_at)
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
