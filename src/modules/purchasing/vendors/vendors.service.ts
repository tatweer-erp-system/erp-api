import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateVendorDto } from './dto/create-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM vendors WHERE deleted_at IS NULL ORDER BY name`,
      { type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM vendors WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const vendor = (rows as any[])[0];
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async create(tenantSlug: string, dto: CreateVendorDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO vendors (id, name, email, phone, address, tax_number, is_active, notes, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :email, :phone, :address, :taxNumber, true, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          name: dto.name,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
          taxNumber: dto.taxNumber ?? null,
          notes: dto.notes ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    return this.findOne(tenantSlug, id);
  }
}
