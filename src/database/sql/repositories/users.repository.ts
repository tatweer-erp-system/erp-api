import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

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
    const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const searchClause = search
      ? `AND (email ILIKE :search OR first_name ILIKE :search OR last_name ILIKE :search)`
      : '';

    const replacements: Record<string, unknown> = {
      tenantId,
      limit,
      offset,
      ...(search ? { search: `%${search}%` } : {}),
    };

    const [rows] = await sequelize.query(
      `SELECT id, email, first_name, last_name, phone, avatar_url, preferred_lang,
              is_active, last_login_at, version, created_at, updated_at
       FROM users WHERE deleted_at IS NULL AND tenant_id = :tenantId ${searchClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT :limit OFFSET :offset`,
      { replacements },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM users WHERE deleted_at IS NULL AND tenant_id = :tenantId ${searchClause}`,
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
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.preferred_lang, u.is_active, u.last_login_at,
              u.extra_permissions, u.revoked_permissions, u.version,
              u.created_at, u.updated_at,
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r.name, 'is_system', r.is_system))
                FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       WHERE u.id = :id AND u.deleted_at IS NULL AND u.tenant_id = :tenantId
       GROUP BY u.id`,
      { replacements: { id, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async existsByEmail(tenantId: string, email: string, excludeId?: string): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const whereClause = excludeId
      ? `email = :email AND id != :excludeId AND deleted_at IS NULL AND tenant_id = :tenantId`
      : `email = :email AND deleted_at IS NULL AND tenant_id = :tenantId`;

    const [existing] = await sequelize.query(`SELECT id FROM users WHERE ${whereClause}`, {
      replacements: { email, tenantId, ...(excludeId ? { excludeId } : {}) },
    });

    return (existing as unknown as any[]).length > 0;
  }

  async existsByPhone(tenantId: string, phone: string): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [existing] = await sequelize.query(
      `SELECT id FROM users WHERE phone = :phone AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { phone, tenantId } },
    );

    return (existing as unknown as any[]).length > 0;
  }

  async findByEmail(tenantId: string, email: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.preferred_lang, u.is_active, u.last_login_at,
              u.extra_permissions, u.revoked_permissions,
              u.created_at, u.updated_at,
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r.name))
                FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       WHERE u.email = :email AND u.deleted_at IS NULL AND u.tenant_id = :tenantId
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
      `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, phone, is_active,
                          created_by, updated_by, version, created_at, updated_at)
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

    const updates: string[] = ['updated_at = NOW()'];
    const replacements: Record<string, unknown> = { id, tenantId };

    if (data.updatedBy) {
      updates.push('updated_by = :updatedBy');
      replacements.updatedBy = data.updatedBy;
    }

    if (data.email !== undefined) {
      updates.push('email = :email');
      replacements.email = data.email;
    }

    if (data.firstName !== undefined) {
      updates.push('first_name = :firstName');
      replacements.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      updates.push('last_name = :lastName');
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
      `UPDATE users SET ${updates.join(', ')} WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements },
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy?: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE users SET deleted_at = NOW(), updated_by = :updatedBy, updated_at = NOW()
       WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId, updatedBy: updatedBy ?? null } },
    );
  }

  async findDeletedById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT id FROM users WHERE id = :id AND deleted_at IS NOT NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async restore(tenantId: string, id: string, updatedBy?: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE users SET deleted_at = NULL, updated_by = :updatedBy, updated_at = NOW()
       WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId, updatedBy: updatedBy ?? null } },
    );
  }

  async findWithPasswordHash(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT id, password_hash FROM users WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async updatePasswordHash(tenantId: string, id: string, hash: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId, hash } },
    );
  }

  async getDropdown(tenantId: string, options: { search?: string; limit?: number } = {}) {
    const { search, limit = 50 } = options;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const searchClause = search
      ? `AND (email ILIKE :search OR first_name ILIKE :search OR last_name ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email as code
       FROM users
       WHERE deleted_at IS NULL AND is_active = true AND tenant_id = :tenantId
       ${searchClause}
       ORDER BY first_name ASC
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
      `DELETE FROM user_roles WHERE user_id = :userId AND tenant_id = :tenantId`,
      {
        replacements: { userId, tenantId },
      },
    );

    // Insert new assignments
    for (const roleId of roleIds) {
      await sequelize.query(
        `INSERT INTO user_roles (id, tenant_id, user_id, role_id, created_at, updated_at)
         VALUES (:id, :tenantId, :userId, :roleId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        { replacements: { id: uuidv4(), tenantId, userId, roleId } },
      );
    }
  }

  /**
   * Get all permissions (as "module:action" strings) for a user's roles
   * via user_roles -> role_permissions -> permissions join.
   */
  async getUserRolePermissions(tenantId: string, userId: string): Promise<string[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT DISTINCT CONCAT(p.module, ':', p.action) as permission
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.tenant_id = ur.tenant_id
       JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
       WHERE ur.user_id = :userId AND ur.tenant_id = :tenantId`,
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
      `SELECT extra_permissions, revoked_permissions
       FROM users
       WHERE id = :userId AND tenant_id = :tenantId AND deleted_at IS NULL
       LIMIT 1`,
      { replacements: { userId, tenantId } },
    );

    const user = (rows as any[])?.[0];
    return {
      extraPermissions: user?.extra_permissions || [],
      revokedPermissions: user?.revoked_permissions || [],
    };
  }

  async findPendingErasureRequest(tenantId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [existing] = await sequelize.query(
      `SELECT id FROM erasure_requests WHERE user_id = :userId AND status = 'pending' AND tenant_id = :tenantId`,
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
    const id = uuidv4();

    await sequelize.query(
      `INSERT INTO erasure_requests (id, tenant_id, user_id, requested_at, status, reason, created_at, updated_at)
       VALUES (:id, :tenantId, :userId, NOW(), 'pending', :reason, NOW(), NOW())`,
      { replacements: { id, tenantId, userId, reason: reason ?? null } },
    );

    return id;
  }
}
