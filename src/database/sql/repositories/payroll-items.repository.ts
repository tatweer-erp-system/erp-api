import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { PayrollItem } from '../entities/payroll-item.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class PayrollItemsRepository extends BaseRepository<PayrollItem> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(PayrollItem, false);
  }

  async findByRunId(runId: string, transaction?: Transaction): Promise<PayrollItem[]> {
    return this.findAllRaw({ where: { runId }, transaction, bypassTenantScope: true });
  }

  async findByRunAndEmployee(
    runId: string,
    employeeId: string,
    transaction?: Transaction,
  ): Promise<PayrollItem | null> {
    return this.findOne({ where: { runId, employeeId }, transaction, bypassTenantScope: true });
  }

  async getPayrollReport(
    tenantId: string,
    options: { fromDate: string; toDate: string },
  ): Promise<
    {
      employeeId: string;
      totalGross: number;
      totalNet: number;
      totalDeductions: number;
      totalGosiEmployee: number;
      totalGosiEmployer: number;
      runCount: number;
    }[]
  > {
    const results = await this.rawQuery<
      {
        employeeId: string;
        totalGross: string;
        totalNet: string;
        totalDeductions: string;
        totalGosiEmployee: string;
        totalGosiEmployer: string;
        runCount: string;
      }[]
    >(
      `SELECT
         pi."employeeId",
         COALESCE(SUM(pi."grossSalary"), 0) AS "totalGross",
         COALESCE(SUM(pi."netPay"), 0) AS "totalNet",
         COALESCE(SUM(pi."totalDeductions"), 0) AS "totalDeductions",
         COALESCE(SUM(pi."gosiEmployee"), 0) AS "totalGosiEmployee",
         COALESCE(SUM(pi."gosiEmployer"), 0) AS "totalGosiEmployer",
         COUNT(DISTINCT pi."runId") AS "runCount"
       FROM payroll_items pi
       INNER JOIN payroll_runs pr ON pr.id = pi."runId"
       WHERE pr."tenantId" = :tenantId
         AND pr."periodStart" >= :fromDate
         AND pr."periodEnd" <= :toDate
         AND pr."deletedAt" IS NULL
       GROUP BY pi."employeeId"
       ORDER BY pi."employeeId"`,
      { tenantId, fromDate: options.fromDate, toDate: options.toDate },
    );
    return results.map((r) => ({
      employeeId: r.employeeId,
      totalGross: parseFloat(r.totalGross),
      totalNet: parseFloat(r.totalNet),
      totalDeductions: parseFloat(r.totalDeductions),
      totalGosiEmployee: parseFloat(r.totalGosiEmployee),
      totalGosiEmployer: parseFloat(r.totalGosiEmployer),
      runCount: parseInt(r.runCount, 10),
    }));
  }
}
