import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';
import { AppearanceTheme, AppearanceLanguage, AppearanceDensity } from '@/common/enums/user.enums';

const APPEARANCE_DEFAULTS = {
  theme: AppearanceTheme.SYSTEM,
  primaryColor: '#1677ff',
  language: AppearanceLanguage.EN,
  density: AppearanceDensity.DEFAULT,
};

@Injectable()
export class UsersRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, search, sortBy = '"createdAt"', sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const searchClause = search
      ? `AND (email ILIKE :search OR "firstName" ILIKE :search OR "lastName" ILIKE :search)`
      : '';

    const replacements: Record<string, unknown> = {
      tenantId,
      limit,
      offset,
      ...(search ? { search: `%${search}%` } : {}),
    };

    const [rows] = await sequelize.query(
      `SELECT id, email, "firstName", "lastName", phone, "avatarUrl", "preferredLang",
              "isActive", "lastLoginAt", version, "createdAt", "updatedAt"
       FROM users WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${searchClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT :limit OFFSET :offset`,
      { replacements },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM users WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${searchClause}`,
      { replacements: { tenantId, ...(search ? { search: `%${search}%` } : {}) } },
    );

    const total = (countResult as unknown as any[])[0]?.total ?? 0;

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT u.id, u.email, u."firstName", u."lastName", u.phone, u."avatarUrl",
              u."preferredLang", u."isActive", u."lastLoginAt",
              u."extraPermissions", u."revokedPermissions", u.version,
              u."createdAt", u."updatedAt",
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r."nameEn", 'isSystem', r."isSystem"))
                FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur."userId" = u.id AND ur."tenantId" = u."tenantId"
       LEFT JOIN roles r ON r.id = ur."roleId" AND r."deletedAt" IS NULL
       WHERE u.id = :id AND u."deletedAt" IS NULL AND u."tenantId" = :tenantId
       GROUP BY u.id`,
      { replacements: { id, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async existsByEmail(tenantId: string, email: string, excludeId?: string): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const whereClause = excludeId
      ? `email = :email AND id != :excludeId AND "deletedAt" IS NULL AND "tenantId" = :tenantId`
      : `email = :email AND "deletedAt" IS NULL AND "tenantId" = :tenantId`;

    const [existing] = await sequelize.query(`SELECT id FROM users WHERE ${whereClause}`, {
      replacements: { email, tenantId, ...(excludeId ? { excludeId } : {}) },
    });

    return (existing as unknown as any[]).length > 0;
  }

  async existsByPhone(tenantId: string, phone: string): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [existing] = await sequelize.query(
      `SELECT id FROM users WHERE phone = :phone AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { phone, tenantId } },
    );

    return (existing as unknown as any[]).length > 0;
  }

  async findByEmail(tenantId: string, email: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT u.id, u.email, u."passwordHash", u."firstName", u."lastName", u.phone, u."avatarUrl",
              u."preferredLang", u."isActive", u."lastLoginAt",
              u."extraPermissions", u."revokedPermissions",
              u."createdAt", u."updatedAt",
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r."nameEn"))
                FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur."userId" = u.id AND ur."tenantId" = u."tenantId"
       LEFT JOIN roles r ON r.id = ur."roleId" AND r."deletedAt" IS NULL
       WHERE u.email = :email AND u."deletedAt" IS NULL AND u."tenantId" = :tenantId
       GROUP BY u.id
       LIMIT 1`,
      { replacements: { email, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      id: string;
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      createdBy?: string | null;
    },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", phone, "isActive",
                          "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :email, :passwordHash, :firstName, :lastName, :phone, true,
               :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id: data.id,
          tenantId,
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone ?? null,
          createdBy: data.createdBy ?? null,
        },
      },
    );
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      updatedBy?: string | null;
      version?: number;
    },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const updates: string[] = ['"updatedAt" = NOW()'];
    const replacements: Record<string, unknown> = { id, tenantId };

    if (data.updatedBy) {
      updates.push('"updatedBy" = :updatedBy');
      replacements.updatedBy = data.updatedBy;
    }

    if (data.email !== undefined) {
      updates.push('email = :email');
      replacements.email = data.email;
    }

    if (data.firstName !== undefined) {
      updates.push('"firstName" = :firstName');
      replacements.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      updates.push('"lastName" = :lastName');
      replacements.lastName = data.lastName;
    }

    if (data.phone !== undefined) {
      updates.push('phone = :phone');
      replacements.phone = data.phone;
    }

    // Optimistic locking: increment version
    if (data.version !== undefined) {
      updates.push('version = version + 1');
    }

    await sequelize.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements },
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy?: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE users SET "deletedAt" = NOW(), "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy: updatedBy ?? null } },
    );
  }

  async findDeletedById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT id FROM users WHERE id = :id AND "deletedAt" IS NOT NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async restore(tenantId: string, id: string, updatedBy?: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE users SET "deletedAt" = NULL, "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy: updatedBy ?? null } },
    );
  }

  async findWithPasswordHash(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT id, "passwordHash" FROM users WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async updatePasswordHash(tenantId: string, id: string, hash: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE users SET "passwordHash" = :hash, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, hash } },
    );
  }

  async getDropdown(tenantId: string, options: { search?: string; limit?: number } = {}) {
    const { search, limit = 50 } = options;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const searchClause = search
      ? `AND (email ILIKE :search OR "firstName" ILIKE :search OR "lastName" ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, CONCAT("firstName", ' ', "lastName") as name, email as code
       FROM users
       WHERE "deletedAt" IS NULL AND "isActive" = true AND "tenantId" = :tenantId
       ${searchClause}
       ORDER BY "firstName" ASC
       LIMIT :limit`,
      {
        replacements: {
          tenantId,
          limit,
          ...(search ? { search: `%${search}%` } : {}),
        },
      },
    );

    return rows;
  }

  async assignRoles(tenantId: string, userId: string, roleIds: string[]): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Remove existing role assignments
    await sequelize.query(
      `DELETE FROM user_roles WHERE "userId" = :userId AND "tenantId" = :tenantId`,
      {
        replacements: { userId, tenantId },
      },
    );

    // Insert new assignments
    for (const roleId of roleIds) {
      await sequelize.query(
        `INSERT INTO user_roles ("tenantId", "userId", "roleId", "createdAt", "updatedAt")
         VALUES (:tenantId, :userId, :roleId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        { replacements: { tenantId, userId, roleId } },
      );
    }
  }

  /**
   * Get all permissions (as "module:action" strings) for a user's roles
   * via user_roles -> rolePermissions -> permissions join.
   */
  async getUserRolePermissions(tenantId: string, userId: string): Promise<string[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT DISTINCT CONCAT(p.module, ':', p.action) as permission
       FROM user_roles ur
       JOIN "rolePermissions" rp ON rp."roleId" = ur."roleId" AND rp."tenantId" = ur."tenantId"
       JOIN permissions p ON p.id = rp."permissionId" AND p."deletedAt" IS NULL
       WHERE ur."userId" = :userId AND ur."tenantId" = :tenantId`,
      { replacements: { userId, tenantId } },
    );

    return (rows as any[]).map((r: any) => r.permission);
  }

  /**
   * Get a user's extra_permissions and revoked_permissions JSONB arrays.
   */
  async getUserPermissionOverrides(
    tenantId: string,
    userId: string,
  ): Promise<{ extraPermissions: string[]; revokedPermissions: string[] }> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT "extraPermissions", "revokedPermissions"
       FROM users
       WHERE id = :userId AND "tenantId" = :tenantId AND "deletedAt" IS NULL
       LIMIT 1`,
      { replacements: { userId, tenantId } },
    );

    const user = (rows as any[])?.[0];
    return {
      extraPermissions: user?.extraPermissions || [],
      revokedPermissions: user?.revokedPermissions || [],
    };
  }

  async findPendingErasureRequest(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [existing] = await sequelize.query(
      `SELECT id FROM erasure_requests WHERE "userId" = :userId AND status = 'pending' AND "tenantId" = :tenantId`,
      { replacements: { userId, tenantId } },
    );

    return (existing as unknown as any[]).length > 0;
  }

  async createErasureRequest(
    tenantId: string,
    userId: string,
    reason?: string | null,
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();

    await sequelize.query(
      `INSERT INTO erasure_requests (id, "tenantId", "userId", "requestedAt", status, reason, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :userId, NOW(), 'pending', :reason, NOW(), NOW())`,
      { replacements: { id, tenantId, userId, reason: reason ?? null } },
    );

    return id;
  }

  // ── Appearance Settings ────────────────────────────────────────────────────

  async findAppearance(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT id, "userId", theme, "primaryColor", language, density,
              "createdAt", "updatedAt"
       FROM user_appearance_settings
       WHERE "userId" = :userId AND "tenantId" = :tenantId AND "deletedAt" IS NULL
       LIMIT 1`,
      { replacements: { userId, tenantId } },
    );

    const row = (rows as unknown as any[])[0] ?? null;
    if (!row) {
      return { ...APPEARANCE_DEFAULTS };
    }

    return {
      id: row.id,
      userId: row.userId,
      theme: row.theme,
      primaryColor: row.primaryColor,
      language: row.language,
      density: row.density,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async upsertAppearance(
    tenantId: string,
    userId: string,
    data: {
      theme?: string;
      primaryColor?: string;
      language?: string;
      density?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();

    const theme = data.theme ?? APPEARANCE_DEFAULTS.theme;
    const primaryColor = data.primaryColor ?? APPEARANCE_DEFAULTS.primaryColor;
    const language = data.language ?? APPEARANCE_DEFAULTS.language;
    const density = data.density ?? APPEARANCE_DEFAULTS.density;

    await sequelize.query(
      `INSERT INTO user_appearance_settings (id, "tenantId", "userId", theme, "primaryColor", language, density, version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :userId, :theme, :primaryColor, :language, :density, 0, NOW(), NOW())
       ON CONFLICT ("tenantId", "userId") WHERE "deletedAt" IS NULL
       DO UPDATE SET
         theme = COALESCE(:themeUpdate, user_appearance_settings.theme),
         "primaryColor" = COALESCE(:primaryColorUpdate, user_appearance_settings."primaryColor"),
         language = COALESCE(:languageUpdate, user_appearance_settings.language),
         density = COALESCE(:densityUpdate, user_appearance_settings.density),
         "updatedAt" = NOW(),
         version = user_appearance_settings.version + 1`,
      {
        replacements: {
          id,
          tenantId,
          userId,
          theme,
          primaryColor,
          language,
          density,
          themeUpdate: data.theme ?? null,
          primaryColorUpdate: data.primaryColor ?? null,
          languageUpdate: data.language ?? null,
          densityUpdate: data.density ?? null,
        },
      },
    );

    return this.findAppearance(tenantId, userId);
  }
}
