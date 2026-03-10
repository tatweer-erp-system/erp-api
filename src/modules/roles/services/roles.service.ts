import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import { PermissionCacheService } from './permission-cache.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const searchClause = query.search
      ? `AND (name ILIKE :search OR description ILIKE :search)`
      : '';

    const sortColumn = query.sortBy ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'DESC';

    const [rows] = await sequelize.query(
      `SELECT id, name, description, is_system, created_at, updated_at
       FROM roles WHERE deleted_at IS NULL ${searchClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          limit,
          offset,
          ...(query.search ? { search: `%${query.search}%` } : {}),
        },
      },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM roles WHERE deleted_at IS NULL ${searchClause}`,
      {
        replacements: query.search ? { search: `%${query.search}%` } : {},
      },
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

  async findById(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [rows] = await sequelize.query(
      `SELECT r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at,
              COALESCE(
                json_agg(json_build_object('id', p.id, 'module', p.module, 'action', p.action))
                FILTER (WHERE p.id IS NOT NULL), '[]'
              ) as permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
       WHERE r.id = :id AND r.deleted_at IS NULL
       GROUP BY r.id`,
      { replacements: { id } },
    );

    const role = (rows as unknown as any[])[0];
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(tenantSlug: string, dto: CreateRoleDto, auditContext?: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Check name uniqueness
    const [existing] = await sequelize.query(
      `SELECT id FROM roles WHERE name = :name AND deleted_at IS NULL`,
      { replacements: { name: dto.name } },
    );
    if ((existing as unknown as any[]).length > 0) {
      throw new ConflictException('Role name already exists');
    }

    const id = uuidv4();
    const createdBy = auditContext?.userId ?? null;
    const description = dto.description_en ?? null;

    await sequelize.query(
      `INSERT INTO roles (id, name, description, is_system, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :description, false, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: { id, name: dto.name, description, createdBy },
      },
    );

    // Assign permissions if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await this.assignPermissionsInternal(sequelize, id, dto.permissionIds);
    }

    this.logger.log(`Role '${dto.name}' created in tenant ${tenantSlug}`);
    return this.findById(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateRoleDto, auditContext?: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const role = await this.findById(tenantSlug, id);

    if (role.is_system) {
      throw new BadRequestException('System roles cannot be modified');
    }

    const updates: string[] = ['updated_at = NOW()'];
    const replacements: Record<string, unknown> = { id };

    if (auditContext?.userId) {
      updates.push('updated_by = :updatedBy');
      replacements.updatedBy = auditContext.userId;
    }

    if (dto.name !== undefined) {
      // Check name uniqueness
      const [existing] = await sequelize.query(
        `SELECT id FROM roles WHERE name = :name AND id != :id AND deleted_at IS NULL`,
        { replacements: { name: dto.name, id } },
      );
      if ((existing as unknown as any[]).length > 0) {
        throw new ConflictException('Role name already exists');
      }
      updates.push('name = :name');
      replacements.name = dto.name;
    }

    if (dto.description_en !== undefined) {
      updates.push('description = :description');
      replacements.description = dto.description_en;
    }

    await sequelize.query(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = :id AND deleted_at IS NULL`,
      { replacements },
    );

    // Update permissions if provided
    if (dto.permissionIds !== undefined) {
      await this.assignPermissionsInternal(sequelize, id, dto.permissionIds);
      await this.permissionCacheService.invalidateRolePermissions(tenantSlug, id, sequelize);
    }

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext?: AuditContext) {
    const role = await this.findById(tenantSlug, id);

    if (role.is_system) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    await sequelize.query(
      `UPDATE roles SET deleted_at = NOW(), updated_by = :updatedBy, updated_at = NOW()
       WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id, updatedBy: auditContext?.userId ?? null } },
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const limit = query.limit ?? 50;

    const searchClause = query.search ? `AND name ILIKE :search` : '';

    const [rows] = await sequelize.query(
      `SELECT id, name
       FROM roles
       WHERE deleted_at IS NULL
       ${searchClause}
       ORDER BY name ASC
       LIMIT :limit`,
      {
        replacements: {
          limit,
          ...(query.search ? { search: `%${query.search}%` } : {}),
        },
      },
    );

    return rows;
  }

  async assignPermissions(tenantSlug: string, roleId: string, permissionIds: string[]) {
    const role = await this.findById(tenantSlug, roleId);

    if (role.is_system) {
      throw new BadRequestException('System role permissions cannot be modified');
    }

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await this.assignPermissionsInternal(sequelize, roleId, permissionIds);
    await this.permissionCacheService.invalidateRolePermissions(tenantSlug, roleId, sequelize);

    return this.findById(tenantSlug, roleId);
  }

  async getPermissions(tenantSlug: string, roleId: string) {
    await this.findById(tenantSlug, roleId);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [rows] = await sequelize.query(
      `SELECT p.id, p.module, p.action, p.description, p.conditions
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = :roleId AND p.deleted_at IS NULL
       ORDER BY p.module, p.action`,
      { replacements: { roleId } },
    );

    return rows;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assignPermissionsInternal(sequelize: any, roleId: string, permissionIds: string[]) {
    // Remove existing assignments
    await sequelize.query(`DELETE FROM role_permissions WHERE role_id = :roleId`, {
      replacements: { roleId },
    });

    // Insert new assignments
    for (const permissionId of permissionIds) {
      await sequelize.query(
        `INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
         VALUES (:id, :roleId, :permissionId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        { replacements: { id: uuidv4(), roleId, permissionId } },
      );
    }
  }
}
