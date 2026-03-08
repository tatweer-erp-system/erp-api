import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, module, action, description, conditions FROM permissions WHERE deleted_at IS NULL ORDER BY module, action`,
      { type: 'SELECT' } as any,
    );
    return rows;
  }

  async findByRole(tenantSlug: string, roleId: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT p.id, p.module, p.action, p.description, p.conditions
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = :roleId AND p.deleted_at IS NULL`,
      { replacements: { roleId }, type: 'SELECT' } as any,
    );
    return rows;
  }
}
