import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../base.repository';
import { Role } from '../entities/role.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RolesRepository extends TenantAwareRepository<Role> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Role);
  }

  async findByName(name: string, tenantId: string): Promise<Role | null> {
    return this.findOne({ where: { name }, tenantId });
  }

  async existsByName(name: string, tenantId: string): Promise<boolean> {
    return this.exists({ name }, tenantId);
  }

  // ── Tenant-aware raw query methods ────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      sortColumn: string;
      sortOrder: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const offset = (options.page - 1) * options.limit;

    const searchClause = options.search
      ? `AND (name ILIKE :search OR description ILIKE :search)`
      : '';

    const replacements: Record<string, unknown> = {
      tenantId,
      limit: options.limit,
      offset,
      ...(options.search ? { search: `%${options.search}%` } : {}),
    };

    const [rows] = await sequelize.query(
      `SELECT id, name, description, is_system, created_at, updated_at
       FROM roles WHERE deleted_at IS NULL AND tenant_id = :tenantId ${searchClause}
       ORDER BY ${options.sortColumn} ${options.sortOrder}
       LIMIT :limit OFFSET :offset`,
      { replacements },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM roles WHERE deleted_at IS NULL AND tenant_id = :tenantId ${searchClause}`,
      {
        replacements: { tenantId, ...(options.search ? { search: `%${options.search}%` } : {}) },
      },
    );

    const total = (countResult as unknown as any[])[0]?.total ?? 0;

    return { rows, total };
  }

  async findByIdWithPermissions(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at,
              COALESCE(
                json_agg(json_build_object('id', p.id, 'module', p.module, 'action', p.action))
                FILTER (WHERE p.id IS NOT NULL), '[]'
              ) as permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
       WHERE r.id = :id AND r.deleted_at IS NULL AND r.tenant_id = :tenantId
       GROUP BY r.id`,
      { replacements: { id, tenantId } },
    );

    return (rows as unknown as any[])[0] ?? null;
  }

  async existsByNameExcludingId(tenantId: string, name: string, excludeId?: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const idClause = excludeId ? `AND id != :excludeId` : '';
    const replacements: Record<string, unknown> = { name, tenantId };
    if (excludeId) replacements.excludeId = excludeId;

    const [existing] = await sequelize.query(
      `SELECT id FROM roles WHERE name = :name AND deleted_at IS NULL AND tenant_id = :tenantId ${idClause}`,
      { replacements },
    );

    return (existing as unknown as any[]).length > 0;
  }

  async createRole(
    tenantId: string,
    data: { name: string; description: string | null; createdBy: string | null },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();

    await sequelize.query(
      `INSERT INTO roles (id, tenant_id, name, description, is_system, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :tenantId, :name, :description, false, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          name: data.name,
          description: data.description,
          createdBy: data.createdBy,
        },
      },
    );

    return id;
  }

  async updateRole(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { ...replacements, tenantId } },
    );
  }

  async softDeleteRole(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE roles SET deleted_at = NOW(), updated_by = :updatedBy, updated_at = NOW()
       WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId, updatedBy } },
    );
  }

  async findForDropdown(tenantId: string, options: { limit: number; search?: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const searchClause = options.search ? `AND name ILIKE :search` : '';

    const [rows] = await sequelize.query(
      `SELECT id, name
       FROM roles
       WHERE deleted_at IS NULL AND tenant_id = :tenantId
       ${searchClause}
       ORDER BY name ASC
       LIMIT :limit`,
      {
        replacements: {
          tenantId,
          limit: options.limit,
          ...(options.search ? { search: `%${options.search}%` } : {}),
        },
      },
    );

    return rows;
  }

  async assignPermissions(
    tenantId: string,
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Remove existing assignments
    await sequelize.query(
      `DELETE FROM role_permissions WHERE role_id = :roleId AND tenant_id = :tenantId`,
      {
        replacements: { roleId, tenantId },
      },
    );

    // Insert new assignments
    for (const permissionId of permissionIds) {
      await sequelize.query(
        `INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, created_at, updated_at)
         VALUES (:id, :tenantId, :roleId, :permissionId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        { replacements: { id: uuidv4(), tenantId, roleId, permissionId } },
      );
    }
  }

  async findPermissionsByRoleId(tenantId: string, roleId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT p.id, p.module, p.action, p.description, p.conditions
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = :roleId AND p.deleted_at IS NULL AND rp.tenant_id = :tenantId
       ORDER BY p.module, p.action`,
      { replacements: { roleId, tenantId } },
    );

    return rows;
  }

  async findUserIdsByRoleId(tenantId: string, roleId: string): Promise<string[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [users] = await sequelize.query(
      `SELECT user_id FROM user_roles WHERE role_id = :roleId AND tenant_id = :tenantId`,
      { replacements: { roleId, tenantId } },
    );

    return (users as unknown as any[]).map((row: any) => row.user_id);
  }
}
