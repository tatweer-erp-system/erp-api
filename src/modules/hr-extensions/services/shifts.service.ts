import { Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { ShiftsRepository } from '@/database/sql/repositories/shifts.repository';
import { ShiftWorkingDaysRepository } from '@/database/sql/repositories/shift-working-days.repository';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly shiftsRepository: ShiftsRepository,
    private readonly shiftWorkingDaysRepository: ShiftWorkingDaysRepository,
  ) {}

  async create(tenantId: string, dto: CreateShiftDto, auditContext: AuditContext) {
    const transaction = await this.shiftsRepository.createTransaction();

    try {
      const workingDays = dto.workingDays ?? [1, 2, 3, 4, 5];

      const shift = await this.shiftsRepository.create(
        {
          nameEn: dto.nameEn,
          nameAr: dto.nameAr,
          descriptionEn: dto.descriptionEn ?? null,
          descriptionAr: dto.descriptionAr ?? null,
          startTime: dto.startTime,
          endTime: dto.endTime,
          breakMinutes: dto.breakMinutes ?? 60,
          isOvernight: dto.isOvernight ?? false,
          workingDays, // Keep JSONB column for backward compatibility
          isActive: dto.isActive ?? true,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const shiftId = (shift as any).id;

      // Create working days in the shift_working_days table
      if (workingDays.length > 0) {
        await this.shiftWorkingDaysRepository.bulkCreate({
          data: workingDays.map((dayOfWeek) => ({ shiftId, dayOfWeek })),
          tenantId,
          auditContext,
          transaction,
        });
      }

      await transaction.commit();

      // Return shift with working days array
      return this._enrichWithWorkingDays(tenantId, shift);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
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
    return this._enrichWithWorkingDays(tenantId, shift);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateShiftDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
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

      // If workingDays is provided, replace in the shift_working_days table
      if (dto.workingDays !== undefined) {
        // Delete existing working days for this shift
        const existing = await this.shiftWorkingDaysRepository.findAllRaw({
          where: { shiftId: id },
          tenantId,
          transaction,
        });
        for (const day of existing) {
          await this.shiftWorkingDaysRepository.hardDelete((day as any).id, {
            tenantId,
            transaction,
          });
        }

        // Create new working days
        if (dto.workingDays.length > 0) {
          await this.shiftWorkingDaysRepository.bulkCreate({
            data: dto.workingDays.map((dayOfWeek) => ({ shiftId: id, dayOfWeek })),
            tenantId,
            auditContext,
            transaction,
          });
        }
      }

      if (isOwner) await transaction.commit();
      return this._enrichWithWorkingDays(tenantId, updated);
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

  /**
   * Get the working days for a shift from the shift_working_days table.
   */
  async getWorkingDays(tenantId: string, shiftId: string): Promise<number[]> {
    const days = await this.shiftWorkingDaysRepository.findAllRaw({
      where: { shiftId },
      tenantId,
      order: [['dayOfWeek', 'ASC']],
    });
    return days.map((d: any) => d.dayOfWeek);
  }

  /**
   * Replace working days for a shift.
   */
  async replaceWorkingDays(
    tenantId: string,
    shiftId: string,
    days: number[],
    auditContext: AuditContext,
  ) {
    // Verify shift exists
    const shift = await this.shiftsRepository.findByIdOrNull(shiftId, { tenantId });
    if (!shift) throw new NotFoundException(msg(ErrorMessages.SHIFT_NOT_FOUND, shiftId));

    const transaction = await this.shiftWorkingDaysRepository.createTransaction();
    try {
      // Delete existing days
      const existing = await this.shiftWorkingDaysRepository.findAllRaw({
        where: { shiftId },
        tenantId,
        transaction,
      });
      for (const day of existing) {
        await this.shiftWorkingDaysRepository.hardDelete((day as any).id, {
          tenantId,
          transaction,
        });
      }

      // Create new days
      if (days.length > 0) {
        await this.shiftWorkingDaysRepository.bulkCreate({
          data: days.map((dayOfWeek) => ({ shiftId, dayOfWeek })),
          tenantId,
          auditContext,
          transaction,
        });
      }

      // Also update the JSONB column for backward compatibility
      await this.shiftsRepository.update(shiftId, { workingDays: days } as any, {
        tenantId,
        transaction,
        auditContext,
      });

      await transaction.commit();
      return this.getWorkingDays(tenantId, shiftId);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _enrichWithWorkingDays(tenantId: string, shift: any) {
    const shiftData = typeof shift.toJSON === 'function' ? shift.toJSON() : { ...shift };
    const days = await this.getWorkingDays(tenantId, shiftData.id);
    return { ...shiftData, workingDays: days };
  }
}
