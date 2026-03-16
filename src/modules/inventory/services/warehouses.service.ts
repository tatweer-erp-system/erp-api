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
    const created: any = await this.warehousesRepository.create({
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      location: dto.address || dto.city ? [dto.address, dto.city].filter(Boolean).join(', ') : null,
      createdBy: auditContext.userId ?? null,
    } as any);
    const id = typeof created === 'string' ? created : created.id;
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateWarehouseDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);

    const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
    const replacements: Record<string, unknown> = {
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.nameEn !== undefined) {
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }
    if (dto.address !== undefined || dto.city !== undefined) {
      updates.push('location = :location');
      replacements.location = [dto.address, dto.city].filter(Boolean).join(', ') || null;
    }
    if (dto.isDefault !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isDefault;
    }

    await (this.warehousesRepository as any).update(tenantId, id, updates, replacements);

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
