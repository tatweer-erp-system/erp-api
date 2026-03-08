import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(`SELECT * FROM warehouses WHERE deleted_at IS NULL ORDER BY name->>'en'`, { type: 'SELECT' } as any);
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(`SELECT * FROM warehouses WHERE id = :id AND deleted_at IS NULL`, { replacements: { id }, type: 'SELECT' } as any);
    const wh = (rows as any[])[0];
    if (!wh) throw new NotFoundException('Warehouse not found');
    return wh;
  }

  async create(tenantSlug: string, dto: CreateWarehouseDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO warehouses (id, name, location, is_active, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :location, true, :createdBy, :createdBy, NOW(), NOW())`,
      { replacements: { id, name: JSON.stringify(dto.name), location: dto.location ?? null, createdBy: createdBy ?? null } } as any,
    );
    return this.findOne(tenantSlug, id);
  }
}
