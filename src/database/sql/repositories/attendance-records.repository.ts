import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class AttendanceRecordsRepository extends BaseRepository<AttendanceRecord> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(AttendanceRecord, true);
  }

  /**
   * Sums all workingHours for an employee on the same calendar day,
   * excluding a specific record (used when creating a new record to avoid double-counting).
   */
  async sumDailyHours(
    tenantId: string,
    employeeId: string,
    date: string,
    excludeId: string,
    transaction?: Transaction,
  ): Promise<number> {
    const results = await this.rawQuery<{ totalHours: string }[]>(
      `SELECT COALESCE(SUM("workingHours"), 0) AS "totalHours"
       FROM attendance_records
       WHERE "employeeId" = :employeeId
         AND "tenantId" = :tenantId
         AND date = :date
         AND id != :excludeId`,
      { employeeId, tenantId, date, excludeId },
      transaction,
    );
    return parseFloat((results[0]?.totalHours as unknown as string) ?? '0');
  }

  /**
   * Returns attendance summary aggregated per employee for a date range.
   */
  async getReportSummary(
    tenantId: string,
    options: { employeeId?: string; fromDate: string; toDate: string },
  ): Promise<
    {
      employeeId: string;
      totalDays: number;
      totalWorkingHours: number;
      totalOvertimeMinutes: number;
      totalLateMinutes: number;
    }[]
  > {
    const whereEmployee = options.employeeId ? 'AND "employeeId" = :employeeId' : '';
    const results = await this.rawQuery<
      {
        employeeId: string;
        totalDays: string;
        totalWorkingHours: string;
        totalOvertimeMinutes: string;
        totalLateMinutes: string;
      }[]
    >(
      `SELECT
         "employeeId",
         COUNT(*) AS "totalDays",
         COALESCE(SUM("workingHours"), 0) AS "totalWorkingHours",
         COALESCE(SUM("overtimeMinutes"), 0) AS "totalOvertimeMinutes",
         COALESCE(SUM("lateMinutes"), 0) AS "totalLateMinutes"
       FROM attendance_records
       WHERE "tenantId" = :tenantId
         AND date >= :fromDate
         AND date <= :toDate
         ${whereEmployee}
       GROUP BY "employeeId"
       ORDER BY "employeeId"`,
      {
        tenantId,
        fromDate: options.fromDate,
        toDate: options.toDate,
        employeeId: options.employeeId ?? null,
      },
    );
    return results.map((r) => ({
      employeeId: r.employeeId,
      totalDays: parseInt(r.totalDays, 10),
      totalWorkingHours: parseFloat(r.totalWorkingHours),
      totalOvertimeMinutes: parseInt(r.totalOvertimeMinutes, 10),
      totalLateMinutes: parseInt(r.totalLateMinutes, 10),
    }));
  }
}
