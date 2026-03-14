import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { PayrollRunsRepository } from '@/database/sql/repositories/payroll-runs.repository';
import { PayrollItemsRepository } from '@/database/sql/repositories/payroll-items.repository';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { CreatePayrollRunDto } from '../dto/create-payroll-run.dto';
import { AddPayrollItemDto } from '../dto/add-payroll-item.dto';
import { PayrollReportQueryDto } from '../dto/payroll-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PayrollStatus, SalaryBasis } from '@/common/enums/hr.enums';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly payrollRunsRepository: PayrollRunsRepository,
    private readonly payrollItemsRepository: PayrollItemsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly journalPosterService: JournalPosterSharedService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Payroll Runs ─────────────────────────────────────────────────────────

  async createRun(
    tenantId: string,
    dto: CreatePayrollRunDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    return this.payrollRunsRepository.create(
      {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        status: PayrollStatus.DRAFT,
        notes: dto.notes ?? null,
        currency: 'SAR',
        totalEmployees: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalGosiEmployer: 0,
      } as any,
      { tenantId, auditContext, transaction: containerTransaction },
    );
  }

  async findAllRuns(tenantId: string, query: PaginationDto) {
    return this.payrollRunsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findRunById(tenantId: string, id: string) {
    const run = await this.payrollRunsRepository.findByIdOrNull(id, { tenantId });
    if (!run) throw new NotFoundException(msg(ErrorMessages.PAYROLL_RUN_NOT_FOUND, id));

    const items = await this.payrollItemsRepository.findByRunId(id);
    return { ...run, items };
  }

  async confirmRun(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.payrollRunsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const run = await this.payrollRunsRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!run) throw new NotFoundException(msg(ErrorMessages.PAYROLL_RUN_NOT_FOUND, id));
      if ((run as any).status !== PayrollStatus.DRAFT) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYROLL_WRONG_STATUS, (run as any).status, PayrollStatus.DRAFT),
        );
      }

      const updated = await this.payrollRunsRepository.update(
        id,
        {
          status: PayrollStatus.CONFIRMED,
          processedAt: new Date(),
          processedBy: auditContext.userId ?? null,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async approveRun(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.payrollRunsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const run = await this.payrollRunsRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!run) throw new NotFoundException(msg(ErrorMessages.PAYROLL_RUN_NOT_FOUND, id));
      if ((run as any).status !== PayrollStatus.CONFIRMED) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYROLL_WRONG_STATUS, (run as any).status, PayrollStatus.CONFIRMED),
        );
      }

      const updated = await this.payrollRunsRepository.update(
        id,
        {
          status: PayrollStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: auditContext.userId ?? null,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();

      // Post journal entry for payroll — log error but do not fail approval
      try {
        const items = await this.payrollItemsRepository.findByRunId(id);
        const runData = updated as any;
        let netSalaries = 0;
        let gosiEmployer = 0;
        let gosiEmployee = 0;
        for (const item of items) {
          const d = item as any;
          netSalaries += parseFloat(String(d.grossPay ?? 0));
          gosiEmployer += parseFloat(String(d.gosiEmployer ?? 0));
          gosiEmployee += parseFloat(String(d.gosiEmployee ?? 0));
        }
        await this.journalPosterService.postPayroll(
          tenantId,
          id,
          {
            entryDate: String(runData.periodEnd ?? new Date().toISOString().split('T')[0]),
            netSalaries,
            gosiEmployerAmount: gosiEmployer,
            gosiEmployeeAmount: gosiEmployee,
            payrollRunNumber: runData.runNumber ?? `PR-${id.slice(0, 8)}`,
          },
          auditContext,
        );
      } catch (journalErr) {
        this.logger.error(
          `Failed to post journal entry for payroll run ${id}: ${(journalErr as Error).message}`,
          (journalErr as Error).stack,
        );
      }

      // Send payroll approved notifications to employees
      try {
        const notifItems = await this.payrollItemsRepository.findByRunId(id);
        for (const item of notifItems) {
          const itemData = item as any;
          const employee = await this.employeesRepository.findByIdOrNull(itemData.employeeId, {
            tenantId,
          });
          if (!employee) continue;
          const empData = employee as any;
          if (!empData.userId) continue;

          await this.notificationsService.createEvent(
            tenantId,
            'payroll_approved',
            {
              employeeId: itemData.employeeId,
              period: `${(run as any).periodStart} – ${(run as any).periodEnd}`,
              netPay: itemData.netPay,
              currency: 'SAR',
            },
            id,
            'payroll_run',
          );
        }
      } catch (notifErr) {
        this.logger.warn(
          `Payroll notification failed for run ${id}: ${(notifErr as Error).message}`,
        );
      }

      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async markPaid(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.payrollRunsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const run = await this.payrollRunsRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!run) throw new NotFoundException(msg(ErrorMessages.PAYROLL_RUN_NOT_FOUND, id));
      if ((run as any).status !== PayrollStatus.APPROVED) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYROLL_WRONG_STATUS, (run as any).status, PayrollStatus.APPROVED),
        );
      }

      const updated = await this.payrollRunsRepository.update(
        id,
        { status: PayrollStatus.PAID } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Payroll Items ─────────────────────────────────────────────────────────

  async addItem(
    tenantId: string,
    runId: string,
    dto: AddPayrollItemDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.payrollRunsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const run = await this.payrollRunsRepository.findByIdOrNull(runId, { tenantId, transaction });
      if (!run) throw new NotFoundException(msg(ErrorMessages.PAYROLL_RUN_NOT_FOUND, runId));
      if ((run as any).status !== PayrollStatus.DRAFT) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYROLL_WRONG_STATUS, (run as any).status, PayrollStatus.DRAFT),
        );
      }

      // Load employee
      const employee = await this.employeesRepository.findByIdOrNull(dto.employeeId, {
        tenantId,
        transaction,
      });
      if (!employee) {
        throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Employee', dto.employeeId));
      }

      const emp = employee as any;
      const basicSalary: number = emp.basicSalary ?? 0;
      const housingAllowance: number = emp.housingAllowance ?? 0;
      const transportationAllowance: number = emp.transportationAllowance ?? 0;
      const isSaudi: boolean = emp.isSaudi ?? false;

      // Determine salary basis from settings
      const basisSetting = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        'salaryCalculationBasis',
      );
      const salaryBasis: SalaryBasis =
        (basisSetting?.value as SalaryBasis) ?? SalaryBasis.ACTUAL_DAYS;

      // Calculate days in month
      const periodStart = new Date((run as any).periodStart);
      let daysInMonth: number;
      if (salaryBasis === SalaryBasis.FIXED_30) {
        daysInMonth = 30;
      } else {
        const year = periodStart.getFullYear();
        const month = periodStart.getMonth();
        daysInMonth = new Date(year, month + 1, 0).getDate();
      }

      // Absent deduction
      const absentDays = dto.absentDays ?? 0;
      const dailyRate = basicSalary / daysInMonth;
      const absentDeduction = Math.round(absentDays * dailyRate * 100) / 100;

      // Gross salary
      const grossSalary =
        Math.round(
          (basicSalary + housingAllowance + transportationAllowance - absentDeduction) * 100,
        ) / 100;

      // GOSI
      const gosiEmployee = isSaudi ? Math.round(basicSalary * 0.1 * 100) / 100 : 0;
      const gosiEmployer = isSaudi ? Math.round(basicSalary * 0.12 * 100) / 100 : 0;

      // Net before bonus/advance
      const netBeforeBonus = Math.round((grossSalary - gosiEmployee) * 100) / 100;

      // Bonus
      const bonusAmount = dto.bonusAmount ?? 0;

      // Advance deduction capped at 25% of net (Saudi labor law)
      const pendingAdvance = dto.pendingAdvance ?? 0;
      const maxAdvanceDeduction = Math.round(netBeforeBonus * 0.25 * 100) / 100;
      const advanceDeducted = Math.min(pendingAdvance, maxAdvanceDeduction);

      const totalDeductions =
        Math.round((absentDeduction + gosiEmployee + advanceDeducted) * 100) / 100;

      const netPay =
        Math.round((grossSalary - gosiEmployee - advanceDeducted + bonusAmount) * 100) / 100;

      // Upsert payroll item (one per employee per run)
      const existingItem = await this.payrollItemsRepository.findByRunAndEmployee(
        runId,
        dto.employeeId,
        transaction,
      );

      let item: any;
      if (existingItem) {
        item = await this.payrollItemsRepository.update(
          (existingItem as any).id,
          {
            basicSalary,
            housingAllowance,
            transportationAllowance,
            grossSalary,
            absenceDeductions: absentDeduction,
            gosiEmployee,
            gosiEmployer,
            totalDeductions,
            netPay,
          } as any,
          { transaction, bypassTenantScope: true },
        );
      } else {
        item = await this.payrollItemsRepository.create(
          {
            runId,
            employeeId: dto.employeeId,
            basicSalary,
            housingAllowance,
            transportationAllowance,
            grossSalary,
            absenceDeductions: absentDeduction,
            gosiEmployee,
            gosiEmployer,
            totalDeductions,
            netPay,
          } as any,
          { transaction, bypassTenantScope: true },
        );

        // Update run totals
        await this._updateRunTotals(tenantId, runId, transaction);
      }

      if (isOwner) await transaction.commit();
      return item;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async removeItem(
    tenantId: string,
    runId: string,
    itemId: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.payrollRunsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const run = await this.payrollRunsRepository.findByIdOrNull(runId, { tenantId, transaction });
      if (!run) throw new NotFoundException(msg(ErrorMessages.PAYROLL_RUN_NOT_FOUND, runId));
      if ((run as any).status !== PayrollStatus.DRAFT) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYROLL_WRONG_STATUS, (run as any).status, PayrollStatus.DRAFT),
        );
      }

      const item = await this.payrollItemsRepository.findByIdOrNull(itemId, {
        bypassTenantScope: true,
        transaction,
      });
      if (!item || (item as any).runId !== runId) {
        throw new NotFoundException(msg(ErrorMessages.PAYROLL_ITEM_NOT_FOUND, itemId));
      }

      await this.payrollItemsRepository.hardDelete(itemId, {
        transaction,
        bypassTenantScope: true,
      });
      await this._updateRunTotals(tenantId, runId, transaction);

      if (isOwner) await transaction.commit();
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getReport(tenantId: string, query: PayrollReportQueryDto) {
    const today = new Date().toISOString().split('T')[0];
    const fromDate = query.fromDate ?? today;
    const toDate = query.toDate ?? today;
    return this.payrollItemsRepository.getPayrollReport(tenantId, { fromDate, toDate });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _updateRunTotals(
    tenantId: string,
    runId: string,
    transaction: Transaction,
  ): Promise<void> {
    const items = await this.payrollItemsRepository.findByRunId(runId, transaction);
    const totalGross = items.reduce(
      (sum, i) => sum + (parseFloat(String((i as any).grossSalary)) || 0),
      0,
    );
    const totalDeductions = items.reduce(
      (sum, i) => sum + (parseFloat(String((i as any).totalDeductions)) || 0),
      0,
    );
    const totalNet = items.reduce(
      (sum, i) => sum + (parseFloat(String((i as any).netPay)) || 0),
      0,
    );
    const totalGosiEmployer = items.reduce(
      (sum, i) => sum + (parseFloat(String((i as any).gosiEmployer)) || 0),
      0,
    );

    await this.payrollRunsRepository.update(
      runId,
      {
        totalEmployees: items.length,
        totalGross: Math.round(totalGross * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        totalGosiEmployer: Math.round(totalGosiEmployer * 100) / 100,
      } as any,
      { tenantId, transaction },
    );
  }
}
