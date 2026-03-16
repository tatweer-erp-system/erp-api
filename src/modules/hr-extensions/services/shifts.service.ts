import { Injectable, NotFoundException } from '@nestjs/common';

import { ShiftsRepository } from '@/database/sql/repositories/shifts.repository';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class ShiftsService {
  constructor(private readonly shiftsRepository: ShiftsRepository) {}

  async create(tenantId: string, dto: CreateShiftDto, auditContext: AuditContext) {
    return this.shiftsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakMinutes: dto.breakMinutes ?? 60,
        isOvernight: dto.isOvernight ?? false,
        workingDays: dto.workingDays ?? [1, 2, 3, 4, 5],
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async findAll(tenantId: string, query: PaginationDto) {
    return this.shiftsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const shift = await this.shiftsRepository.findByIdOrNull(id, { tenantId });
    if (!shift) throw new NotFoundException(msg(ErrorMessages.SHIFT_NOT_FOUND, id));
    return shift;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateShiftDto,
    auditContext: AuditContext,
    containerTransaction?: unknown,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.shiftsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const shift = await this.shiftsRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!shift) throw new NotFoundException(msg(ErrorMessages.SHIFT_NOT_FOUND, id));

      const updated = await this.shiftsRepository.update(id, dto as any, {
        tenantId,
        transaction,
        auditContext,
      });

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const shift = await this.shiftsRepository.findByIdOrNull(id, { tenantId });
    if (!shift) throw new NotFoundException(msg(ErrorMessages.SHIFT_NOT_FOUND, id));
    await this.shiftsRepository.softDelete(id, { tenantId, auditContext });
  }
}
