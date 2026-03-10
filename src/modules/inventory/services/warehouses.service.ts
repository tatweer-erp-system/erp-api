import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class WarehousesService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search OR location ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM warehouses WHERE deleted_at IS NULL ${whereClause} ORDER BY name->>'en' LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM warehouses WHERE deleted_at IS NULL ${whereClause}`,
      { replacements: { search: search ? `%${search}%` : '' }, type: 'SELECT' } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM warehouses WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const warehouse = (rows as unknown as any[])[0];
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async create(tenantSlug: string, dto: CreateWarehouseDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO warehouses (id, name, location, is_active, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :location, true, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          name: JSON.stringify({ en: dto.name_en, ar: dto.name_ar }),
          location:
            dto.address || dto.city ? [dto.address, dto.city].filter(Boolean).join(', ') : null,
          createdBy: auditContext.userId ?? null,
        },
      } as any,
    );
    return this.findById(tenantSlug, id);
  }

  async update(
    tenantSlug: string,
    id: string,
    dto: UpdateWarehouseDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.name_en !== undefined || dto.name_ar !== undefined) {
      const currentName =
        typeof existing.name === 'string' ? JSON.parse(existing.name) : existing.name;
      updates.push('name = :name');
      replacements.name = JSON.stringify({
        en: dto.name_en ?? currentName?.en ?? '',
        ar: dto.name_ar ?? currentName?.ar ?? '',
      });
    }
    if (dto.address !== undefined || dto.city !== undefined) {
      updates.push('location = :location');
      replacements.location = [dto.address, dto.city].filter(Boolean).join(', ') || null;
    }
    if (dto.isDefault !== undefined) {
      updates.push('is_active = :isActive');
      replacements.isActive = dto.isDefault;
    }

    await sequelize.query(`UPDATE warehouses SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE warehouses SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { search, limit = 50 } = query;
    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, name, location FROM warehouses WHERE deleted_at IS NULL AND is_active = true ${whereClause} ORDER BY name->>'en' LIMIT :limit`,
      {
        replacements: { limit, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );
    return rows;
  }
}
