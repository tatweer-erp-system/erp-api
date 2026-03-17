import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Role } from '../entities/role.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Role, true);
  }

  async findByName(name: string, tenantId: string): Promise<Role | null> {
    return this.findOne({ where: { nameEn: name }, tenantId });
  }

  async existsByName(name: string, tenantId: string): Promise<boolean> {
    return this.exists({ nameEn: name }, { tenantId });
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
      ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search OR "descriptionEn" ILIKE :search OR "descriptionAr" ILIKE :search)`
      : '';

    const replacements: Record<string, unknown> = {
      tenantId,
      limit: options.limit,
      offset,
      ...(options.search ? { search: `%${options.search}%` } : {}),
    };

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", "descriptionEn", "descriptionAr", "isSystem", "createdAt", "updatedAt"
       FROM roles WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${searchClause}
       ORDER BY "${options.sortColumn}" ${options.sortOrder}
       LIMIT :limit OFFSET :offset`,
      { replacements },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM roles WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${searchClause}`,
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
      `SELECT r.id, r."nameEn", r."nameAr", r."descriptionEn", r."descriptionAr", r."isSystem", r."createdAt", r."updatedAt",
              COALESCE(
                json_agg(json_build_object('id', p.id, 'module', p.module, 'action', p.action))
                FILTER (WHERE p.id IS NOT NULL), '[]'
              ) as permissions
       FROM roles r
       LEFT JOIN "rolePermissions" rp ON rp."roleId" = r.id
       LEFT JOIN permissions p ON p.id = rp."permissionId" AND p."deletedAt" IS NULL
       WHERE r.id = :id AND r."deletedAt" IS NULL AND r."tenantId" = :tenantId
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
      `SELECT id FROM roles WHERE "nameEn" = :name AND "deletedAt" IS NULL AND "tenantId" = :tenantId ${idClause}`,
      { replacements },
    );

    return (existing as unknown as any[]).length > 0;
  }

  async createRole(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      descriptionEn: string | null;
      descriptionAr: string | null;
      createdBy: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();

    await sequelize.query(
      `INSERT INTO roles (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", "isSystem", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :nameEn, :nameAr, :descriptionEn, :descriptionAr, false, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          descriptionEn: data.descriptionEn,
          descriptionAr: data.descriptionAr,
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
      `UPDATE roles SET ${updates.join(', ')} WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { ...replacements, tenantId } },
    );
  }

  async softDeleteRole(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    await sequelize.query(
      `UPDATE roles SET "deletedAt" = NOW(), "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } },
    );
  }

  async findForDropdown(tenantId: string, options: { limit: number; search?: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const searchClause = options.search
      ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr"
       FROM roles
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId
       ${searchClause}
       ORDER BY "nameEn" ASC
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
      `DELETE FROM "rolePermissions" WHERE "roleId" = :roleId AND "tenantId" = :tenantId`,
      {
        replacements: { roleId, tenantId },
      },
    );

    // Insert new assignments
    for (const permissionId of permissionIds) {
      await sequelize.query(
        `INSERT INTO "rolePermissions" (id, "tenantId", "roleId", "permissionId", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :roleId, :permissionId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        { replacements: { id: uuidv7(), tenantId, roleId, permissionId } },
      );
    }
  }

  async findPermissionsByRoleId(tenantId: string, roleId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT p.id, p.module, p.action, p.description, p.conditions
       FROM permissions p
       JOIN "rolePermissions" rp ON rp."permissionId" = p.id
       WHERE rp."roleId" = :roleId AND p."deletedAt" IS NULL AND rp."tenantId" = :tenantId
       ORDER BY p.module, p.action`,
      { replacements: { roleId, tenantId } },
    );

    return rows;
  }

  async findUserIdsByRoleId(tenantId: string, roleId: string): Promise<string[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [users] = await sequelize.query(
      `SELECT "userId" FROM user_roles WHERE "roleId" = :roleId AND "tenantId" = :tenantId`,
      { replacements: { roleId, tenantId } },
    );

    return (users as unknown as any[]).map((row: any) => row.userId);
  }
}
