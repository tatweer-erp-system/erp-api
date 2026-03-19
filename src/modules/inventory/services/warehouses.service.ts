import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { StockLocationsRepository } from '@/database/sql/repositories/stock-locations.repository';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { LocationType } from '@/common/enums/inventory-new.enums';

/** Default stock locations auto-created for every new warehouse */
const DEFAULT_LOCATIONS: Array<{
  nameEn: string;
  nameAr: string;
  locationType: LocationType;
  isScrap: boolean;
  isReturn: boolean;
}> = [
  {
    nameEn: 'Internal',
    nameAr: 'داخلي',
    locationType: LocationType.INTERNAL,
    isScrap: false,
    isReturn: false,
  },
  {
    nameEn: 'Input',
    nameAr: 'استلام',
    locationType: LocationType.SUPPLIER,
    isScrap: false,
    isReturn: false,
  },
  {
    nameEn: 'Output',
    nameAr: 'إرسال',
    locationType: LocationType.CUSTOMER,
    isScrap: false,
    isReturn: false,
  },
];

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(
    private readonly warehousesRepository: WarehousesRepository,
    private readonly stockLocationsRepository: StockLocationsRepository,
  ) {}

  async getSummary(tenantId: string) {
    return this.warehousesRepository.getSummary(tenantId);
  }

  async findAll(tenantId: string, pagination: PaginationDto, isActive?: boolean) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.warehousesRepository.findAll(tenantId, {
      limit,
      offset,
      search,
      sortOrder: pagination.sortOrder || 'ASC',
      isActive,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const warehouse = await this.warehousesRepository.findById(tenantId, id);
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    // Fetch associated stock locations
    const { rows: locations } = await this.stockLocationsRepository.findAllPaginated(tenantId, {
      limit: 100,
      offset: 0,
      sortOrder: 'ASC',
      warehouseId: id,
    });

    return { ...warehouse, locations };
  }

  async create(tenantId: string, dto: CreateWarehouseDto, auditContext: AuditContext) {
    const id = await this.warehousesRepository.create(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      location: dto.address || dto.city ? [dto.address, dto.city].filter(Boolean).join(', ') : null,
      createdBy: auditContext.userId ?? null,
    });

    // Auto-create default stock locations for the new warehouse
    for (const loc of DEFAULT_LOCATIONS) {
      try {
        await this.stockLocationsRepository.insertStockLocation(tenantId, {
          nameEn: loc.nameEn,
          nameAr: loc.nameAr,
          fullName: `${dto.nameEn} / ${loc.nameEn}`,
          warehouseId: id,
          parentId: null,
          locationType: loc.locationType,
          isScrap: loc.isScrap,
          isReturn: loc.isReturn,
          isActive: true,
          createdBy: auditContext.userId ?? null,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to create default location "${loc.nameEn}" for warehouse ${id}: ${(error as Error).message}`,
        );
      }
    }

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
