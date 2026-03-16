import { Injectable, Logger, NotFoundException } from '@nestjs/common';

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

  async findAll(branchId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    return this.sectionsRepository.findAll(branchId, undefined, page, limit);
  }

  async findById(branchId: string, id: string) {
    const section = await this.sectionsRepository.findByIdOrNull(id);
    if (!section) {
      throw new NotFoundException(msg(ErrorMessages.SECTION_NOT_FOUND, id));
    }
    return section;
  }

  async create(branchId: string, dto: CreateSectionDto, _auditContext: AuditContext) {
    return this.sectionsRepository.create({
      branchId: dto.branchId,
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      sequence: (dto as any).sortOrder ?? 0,
      isActive: (dto as any).isActive ?? true,
    });
  }

  async update(
    branchId: string,
    id: string,
    dto: UpdateSectionDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    const existing = await this.sectionsRepository.findByIdOrNull(id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.SECTION_NOT_FOUND, id));
    }

    const updates: Partial<typeof existing> = {};
    if ((dto as any).nameEn !== undefined) updates.nameEn = (dto as any).nameEn;
    if ((dto as any).nameAr !== undefined) updates.nameAr = (dto as any).nameAr;
    if ((dto as any).sortOrder !== undefined) updates.sequence = (dto as any).sortOrder;
    if ((dto as any).isActive !== undefined) updates.isActive = (dto as any).isActive;

    return this.sectionsRepository.update(id, updates);
  }

  async remove(branchId: string, id: string, _auditContext: AuditContext) {
    const existing = await this.sectionsRepository.findByIdOrNull(id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.SECTION_NOT_FOUND, id));
    }
    await this.sectionsRepository.softDelete(id);
  }
}
