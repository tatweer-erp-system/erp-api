import { Injectable } from '@nestjs/common';
import { ShiftWorkingDaysRepository } from '@/database/sql/repositories/shift-working-days.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class ShiftWorkingDaysService {
  constructor(private readonly shiftWorkingDaysRepository: ShiftWorkingDaysRepository) {}

  async findByShift(tenantId: string, shiftId: string) {
    return this.shiftWorkingDaysRepository.findAllRaw({
      where: { shiftId },
      tenantId,
      order: [['dayOfWeek', 'ASC']],
    });
  }

  async replaceForShift(
    tenantId: string,
    shiftId: string,
    days: number[],
    auditContext: AuditContext,
  ) {
    const transaction = await this.shiftWorkingDaysRepository.createTransaction();
    try {
      // Delete existing days for this shift
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

      await transaction.commit();
      return this.findByShift(tenantId, shiftId);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
