import { Injectable, NotFoundException } from '@nestjs/common';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class WarehousesService {
  constructor(private readonly warehousesRepository: WarehousesRepository) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.warehousesRepository.findAll(tenantId, {
      limit,
      offset,
      search,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const warehouse = await this.warehousesRepository.findById(tenantId, id);
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async create(tenantId: string, dto: CreateWarehouseDto, auditContext: AuditContext) {
    const id = await this.warehousesRepository.create(tenantId, {
      name: JSON.stringify({ en: dto.name_en, ar: dto.name_ar }),
      location: dto.address || dto.city ? [dto.address, dto.city].filter(Boolean).join(', ') : null,
      createdBy: auditContext.userId ?? null,
    });
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateWarehouseDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = {
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

    await this.warehousesRepository.update(tenantId, id, updates, replacements);

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantId, id);
    await this.warehousesRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.warehousesRepository.findForDropdown(tenantId, { search, limit });
  }
}
