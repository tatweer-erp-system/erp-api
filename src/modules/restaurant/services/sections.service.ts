import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { RestaurantSectionsRepository } from '@/database/sql/repositories/restaurant-sections.repository';
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class SectionsService {
  private readonly logger = new Logger(SectionsService.name);

  constructor(private readonly sectionsRepository: RestaurantSectionsRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy, sortOrder = 'DESC' } = query;
    return this.sectionsRepository.findAll({
      tenantId,
      page,
      limit,
      search,
      searchFields: search ? ['name'] : [],
      sortBy,
      sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const section = await this.sectionsRepository.findByIdOrNull(id, { tenantId });
    if (!section) {
      throw new NotFoundException(msg(ErrorMessages.SECTION_NOT_FOUND, id));
    }
    return section;
  }

  async create(tenantId: string, dto: CreateSectionDto, auditContext: AuditContext) {
    const name = { en: dto.nameEn, ar: dto.nameAr };
    return this.sectionsRepository.create(
      {
        tenantId,
        branchId: dto.branchId,
        name,
        color: dto.color ?? '#1D9E75',
        floorNumber: dto.floorNumber ?? 1,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSectionDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const existing = await this.sectionsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.SECTION_NOT_FOUND, id));
    }

    const updates: Record<string, unknown> = {};

    if (dto.nameEn !== undefined || dto.nameAr !== undefined) {
      const currentName = (existing as any).name ?? { en: '', ar: '' };
      updates['name'] = {
        en: dto.nameEn !== undefined ? dto.nameEn : currentName.en,
        ar: dto.nameAr !== undefined ? dto.nameAr : currentName.ar,
      };
    }
    if (dto.color !== undefined) updates['color'] = dto.color;
    if (dto.floorNumber !== undefined) updates['floorNumber'] = dto.floorNumber;
    if (dto.sortOrder !== undefined) updates['sortOrder'] = dto.sortOrder;
    if (dto.isActive !== undefined) updates['isActive'] = dto.isActive;

    return this.sectionsRepository.update(id, updates as any, {
      tenantId,
      auditContext,
      transaction: containerTransaction,
    });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.sectionsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.SECTION_NOT_FOUND, id));
    }
    await this.sectionsRepository.softDelete(id, { tenantId, auditContext });
  }
}
