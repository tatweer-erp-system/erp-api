import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { StockLocationsRepository } from '@/database/sql/repositories/stock-locations.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { CreateStockLocationDto } from '../dto/create-stock-location.dto';
import { UpdateStockLocationDto } from '../dto/update-stock-location.dto';
import { StockLocationQueryDto } from '../dto/stock-location-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

@Injectable()
export class StockLocationsService {
  constructor(
    private readonly stockLocationsRepository: StockLocationsRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantId: string, query: StockLocationQueryDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.stockLocationsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'ASC',
      warehouseId: query.warehouseId,
      locationType: query.locationType,
      isActive: query.isActive,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const location = await this.stockLocationsRepository.findOneById(tenantId, id);
    if (!location) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'StockLocation', id));
    }
    return location;
  }

  async create(tenantId: string, dto: CreateStockLocationDto, auditContext: AuditContext) {
    const id = await this.stockLocationsRepository.insertStockLocation(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      fullName: dto.fullName ?? null,
      warehouseId: dto.warehouseId ?? null,
      parentId: dto.parentId ?? null,
      locationType: dto.locationType,
      isScrap: dto.isScrap,
      isReturn: dto.isReturn,
      isActive: dto.isActive,
      createdBy: auditContext.userId ?? null,
    });

    await this.auditService.logCreate(
      tenantId,
      'stock_locations',
      id,
      dto as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    return this.findById(tenantId, id);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateStockLocationDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.findById(tenantId, id);

    if (existing.version !== dto.version) {
      throw new ConflictException(
        msg(ErrorMessages.VERSION_CONFLICT, dto.version, existing.version),
      );
    }

    const updates: string[] = [];
    const replacements: Record<string, unknown> = {};

    if (dto.nameEn !== undefined) {
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }
    if (dto.fullName !== undefined) {
      updates.push('"fullName" = :fullName');
      replacements.fullName = dto.fullName;
    }
    if (dto.warehouseId !== undefined) {
      updates.push('"warehouseId" = :warehouseId');
      replacements.warehouseId = dto.warehouseId;
    }
    if (dto.parentId !== undefined) {
      updates.push('"parentId" = :parentId');
      replacements.parentId = dto.parentId;
    }
    if (dto.locationType !== undefined) {
      updates.push('"locationType" = :locationType');
      replacements.locationType = dto.locationType;
    }
    if (dto.isScrap !== undefined) {
      updates.push('"isScrap" = :isScrap');
      replacements.isScrap = dto.isScrap;
    }
    if (dto.isReturn !== undefined) {
      updates.push('"isReturn" = :isReturn');
      replacements.isReturn = dto.isReturn;
    }
    if (dto.isActive !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isActive;
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId ?? null;
    updates.push('"updatedAt" = NOW()');
    updates.push('version = version + 1');

    await this.stockLocationsRepository.updateStockLocation(tenantId, id, updates, replacements);

    await this.auditService.logUpdate(
      tenantId,
      'stock_locations',
      id,
      existing as Record<string, unknown>,
      dto as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);
    await this.stockLocationsRepository.softDelete(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(
      tenantId,
      'stock_locations',
      id,
      existing as Record<string, unknown>,
      auditContext.userId,
    );
  }
}
