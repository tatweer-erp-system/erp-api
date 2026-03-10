import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { LeaveRequest } from '../entities/leave-request.entity';

@Injectable()
export class LeavesRepository extends BaseRepository<LeaveRequest> {
  constructor() {
    super(LeaveRequest);
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.findAllRaw({
      where: { employeeId },
    });
  }

  async findOverlapping(
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeId?: string,
  ): Promise<LeaveRequest[]> {
    const where: Record<string, unknown> = {
      employeeId,
      status: { [Op.notIn]: ['cancelled', 'rejected'] },
      [Op.or]: [
        {
          startDate: { [Op.between]: [startDate, endDate] },
        },
        {
          endDate: { [Op.between]: [startDate, endDate] },
        },
        {
          [Op.and]: [{ startDate: { [Op.lte]: startDate } }, { endDate: { [Op.gte]: endDate } }],
        },
      ],
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return this.findAllRaw({ where });
  }

  async getBalance(employeeId: string, leaveType: string, year: number): Promise<number> {
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const result = await this.model.sum('days_requested', {
      where: {
        employeeId,
        leaveType,
        status: { [Op.in]: ['approved', 'pending'] },
        startDate: { [Op.gte]: startOfYear },
        endDate: { [Op.lte]: endOfYear },
      },
    });

    return result || 0;
  }
}
