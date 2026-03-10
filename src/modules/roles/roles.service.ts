import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { PermissionCacheService } from './permission-cache.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async findAll(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, name, description, is_system, created_at FROM roles WHERE deleted_at IS NULL ORDER BY name`,
      { type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, name, description, is_system FROM roles WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const role = (rows as any[])[0];
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(tenantSlug: string, dto: CreateRoleDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    try {
      await sequelize.query(
        `INSERT INTO roles (id, name, description, is_system, created_by, updated_by, created_at, updated_at)
         VALUES (:id, :name, :description, false, :createdBy, :createdBy, NOW(), NOW())`,
        {
          replacements: {
            id,
            name: dto.name,
            description: dto.description ?? null,
            createdBy: createdBy ?? null,
          },
        } as any,
      );
    } catch {
      throw new ConflictException('Role name already exists');
    }
    return this.findOne(tenantSlug, id);
  }

  async assignPermissions(
    tenantSlug: string,
    roleId: string,
    dto: AssignPermissionDto,
  ): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await this.findOne(tenantSlug, roleId);

    // Remove existing, then insert new
    await sequelize.query(`DELETE FROM role_permissions WHERE role_id = :roleId`, {
      replacements: { roleId },
    } as any);

    for (const permissionId of dto.permissionIds) {
      await sequelize.query(
        `INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
         VALUES (:id, :roleId, :permissionId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        { replacements: { id: uuidv4(), roleId, permissionId } } as any,
      );
    }

    await this.permissionCacheService.invalidateRolePermissions(tenantSlug, roleId, sequelize);
  }

  async assignRoleToUser(tenantSlug: string, userId: string, roleId: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `INSERT INTO user_roles (id, user_id, role_id, created_at, updated_at)
       VALUES (:id, :userId, :roleId, NOW(), NOW())
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      { replacements: { id: uuidv4(), userId, roleId } } as any,
    );
    await this.permissionCacheService.invalidateUserPermissions(tenantSlug, userId);
  }

  async removeRoleFromUser(tenantSlug: string, userId: string, roleId: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`DELETE FROM user_roles WHERE user_id = :userId AND role_id = :roleId`, {
      replacements: { userId, roleId },
    } as any);
    await this.permissionCacheService.invalidateUserPermissions(tenantSlug, userId);
  }
}
