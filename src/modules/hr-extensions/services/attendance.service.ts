import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AttendanceRecordsRepository } from '@/database/sql/repositories/attendance-records.repository';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { ShiftsRepository } from '@/database/sql/repositories/shifts.repository';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { AttendanceReportQueryDto } from '../dto/attendance-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { AttendanceSource, AttendanceStatus } from '@/common/enums/hr.enums';

const PLACEHOLDER_EXCLUDE_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly attendanceRecordsRepository: AttendanceRecordsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly shiftsRepository: ShiftsRepository,
  ) {}

  async create(
    tenantId: string,
    dto: CreateAttendanceDto,
    auditContext: AuditContext,
    containerTransaction?: unknown,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.attendanceRecordsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Verify employee exists
      const employee = await this.employeesRepository.findByIdOrNull(dto.employeeId, {
        tenantId,
        transaction,
      });
      if (!employee) {
        throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Employee', dto.employeeId));
      }

      let workingHours: number | null = null;
      let overtimeMinutes: number | null = null;
      const lateMinutes = 0;

      if (dto.clockIn && dto.clockOut) {
        const checkIn = new Date(dto.clockIn);
        const checkOut = new Date(dto.clockOut);
        const diffMs = checkOut.getTime() - checkIn.getTime();
        workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Calculate overtime: sum all existing hours for the day + this record's hours
        const existingHours = await this.attendanceRecordsRepository.sumDailyHours(
          tenantId,
          dto.employeeId,
          dto.date,
          PLACEHOLDER_EXCLUDE_ID,
          transaction,
        );
        const totalHours = existingHours + workingHours;

        // Load employee's shift to get standardHours
        const emp = employee as any;
        if (emp.shiftId) {
          const shift = await this.shiftsRepository.findByIdOrNull(emp.shiftId, {
            tenantId,
            transaction,
          });
          if (shift) {
            // Calculate standard hours from startTime to endTime minus breakMinutes
            const standardHours = this._calculateShiftStandardHours(shift as any);
            const overtimeHrs = Math.max(0, totalHours - standardHours);
            overtimeMinutes = Math.round(overtimeHrs * 60);
          }
        }
      }

      const record = await this.attendanceRecordsRepository.create(
        {
          employeeId: dto.employeeId,
          date: dto.date,
          clockIn: dto.clockIn ? new Date(dto.clockIn) : null,
          clockOut: dto.clockOut ? new Date(dto.clockOut) : null,
          status: dto.status ?? AttendanceStatus.PRESENT,
          source: dto.source ?? AttendanceSource.MANUAL,
          notes: dto.notes ?? null,
          workingHours,
          overtimeMinutes,
          lateMinutes,
        } as any,
        { tenantId, auditContext, transaction },
      );

      if (isOwner) await transaction.commit();
      return record;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAttendanceDto,
    auditContext: AuditContext,
    containerTransaction?: unknown,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.attendanceRecordsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.attendanceRecordsRepository.findByIdOrNull(id, {
        tenantId,
        transaction,
      });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.ATTENDANCE_NOT_FOUND, id));

      const clockIn = dto.clockIn ? new Date(dto.clockIn) : (existing as any).clockIn;
      const clockOut = dto.clockOut ? new Date(dto.clockOut) : (existing as any).clockOut;

      let workingHours = (existing as any).workingHours;
      let overtimeMinutes = (existing as any).overtimeMinutes;

      if (clockIn && clockOut) {
        const diffMs = clockOut.getTime() - clockIn.getTime();
        workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Recalculate overtime
        const existingHours = await this.attendanceRecordsRepository.sumDailyHours(
          tenantId,
          (existing as any).employeeId,
          (existing as any).date,
          id,
          transaction,
        );
        const totalHours = existingHours + workingHours;

        const emp = await this.employeesRepository.findByIdOrNull((existing as any).employeeId, {
          tenantId,
          transaction,
        });
        if (emp && (emp as any).shiftId) {
          const shift = await this.shiftsRepository.findByIdOrNull((emp as any).shiftId, {
            tenantId,
            transaction,
          });
          if (shift) {
            const standardHours = this._calculateShiftStandardHours(shift as any);
            const overtimeHrs = Math.max(0, totalHours - standardHours);
            overtimeMinutes = Math.round(overtimeHrs * 60);
          }
        }
      }

      const updated = await this.attendanceRecordsRepository.update(
        id,
        {
          ...(dto as any),
          clockIn: dto.clockIn ? new Date(dto.clockIn) : undefined,
          clockOut: dto.clockOut ? new Date(dto.clockOut) : undefined,
          workingHours,
          overtimeMinutes,
        },
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async findAll(tenantId: string, query: PaginationDto & { employeeId?: string }) {
    const where: Record<string, unknown> = {};
    if (query.employeeId) where.employeeId = query.employeeId;

    return this.attendanceRecordsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where,
    });
  }

  async findById(tenantId: string, id: string) {
    const record = await this.attendanceRecordsRepository.findByIdOrNull(id, { tenantId });
    if (!record) throw new NotFoundException(msg(ErrorMessages.ATTENDANCE_NOT_FOUND, id));
    return record;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const record = await this.attendanceRecordsRepository.findByIdOrNull(id, { tenantId });
    if (!record) throw new NotFoundException(msg(ErrorMessages.ATTENDANCE_NOT_FOUND, id));
    await this.attendanceRecordsRepository.softDelete(id, { tenantId, auditContext });
  }

  async importFromCsv(
    tenantId: string,
    records: Array<{ employeeId: string; clockIn: string; clockOut: string; date: string }>,
    auditContext: AuditContext,
  ) {
    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const row of records) {
      try {
        await this.create(
          tenantId,
          {
            employeeId: row.employeeId,
            date: row.date,
            clockIn: row.clockIn,
            clockOut: row.clockOut,
            source: AttendanceSource.IMPORT,
            status: AttendanceStatus.PRESENT,
          },
          auditContext,
        );
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row for employee ${row.employeeId} on ${row.date}: ${err.message}`);
        this.logger.warn(`Attendance import failed for employee ${row.employeeId}`, err);
      }
    }

    return results;
  }

  async getReport(tenantId: string, query: AttendanceReportQueryDto) {
    const today = new Date().toISOString().split('T')[0];
    const fromDate = query.fromDate ?? today;
    const toDate = query.toDate ?? today;

    return this.attendanceRecordsRepository.getReportSummary(tenantId, {
      employeeId: query.employeeId,
      fromDate,
      toDate,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _calculateShiftStandardHours(shift: {
    startTime: string;
    endTime: string;
    breakMinutes: number;
    isOvernight: boolean;
  }): number {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (shift.isOvernight && endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    const grossMinutes = endMinutes - startMinutes;
    const netMinutes = grossMinutes - (shift.breakMinutes ?? 0);
    return Math.max(0, netMinutes / 60);
  }
}
