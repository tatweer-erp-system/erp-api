import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM departments WHERE deleted_at IS NULL ORDER BY name->>'en'`,
      { type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM departments WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const dept = (rows as any[])[0];
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(tenantSlug: string, dto: CreateDepartmentDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO departments (id, name, description, parent_id, manager_id, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :description, :parentId, :managerId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          name: JSON.stringify(dto.name),
          description: dto.description ? JSON.stringify(dto.description) : null,
          parentId: dto.parentId ?? null,
          managerId: dto.managerId ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string): Promise<void> {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`UPDATE departments SET deleted_at = NOW() WHERE id = :id`, {
      replacements: { id },
    } as any);
  }
}
