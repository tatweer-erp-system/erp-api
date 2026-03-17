import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_PAYROLL } from '@/infrastructure/queues/queue.constants';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { ContractStatus } from '@/common/enums/hr.enums';
import { PayrollJobData } from '../interfaces/hr.interface';

/** GOSI rates per the Saudi system */
const GOSI_EMPLOYEE_SAUDI = 0.0975;
const GOSI_EMPLOYER_SAUDI = 0.1175;
const GOSI_EMPLOYEE_NON_SAUDI = 0;
const GOSI_EMPLOYER_NON_SAUDI = 0.1175;

interface EmployeeContractRecord {
  employeeId: string;
  employeeNumber: string;
  isSaudi: boolean;
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
}

interface PayslipResult {
  employeeId: string;
  grossSalary: number;
  gosiEmployeeDeduction: number;
  gosiEmployerContribution: number;
  netSalary: number;
}

@Processor(QUEUE_PAYROLL)
export class PayrollProcessor {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  @Process('run')
  async handleRun(job: Job<PayrollJobData>): Promise<void> {
    const { tenantSlug, tenantId, periodStart, periodEnd, processedBy } = job.data;

    try {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();

      // Join employees with their active contracts — salary data is on contracts now
      const [rows] = await sequelize.query(
        `SELECT
           e.id AS "employeeId",
           e."employeeNumber",
           e."isSaudi",
           COALESCE(c."basicSalary", 0) AS "basicSalary",
           COALESCE(c."housingAllowance", 0) AS "housingAllowance",
           COALESCE(c."transportationAllowance", 0) AS "transportationAllowance"
         FROM employees e
         LEFT JOIN employee_contracts c
           ON c."employeeId" = e.id
           AND c.status = :contractActive
           AND c."deletedAt" IS NULL
           AND c."tenantId" = :tenantId
         WHERE e."tenantId" = :tenantId
           AND e."isActive" = true
           AND e."deletedAt" IS NULL
         ORDER BY e."employeeNumber" ASC`,
        {
          replacements: {
            tenantId,
            contractActive: ContractStatus.ACTIVE,
          },
        },
      );

      const payslips: PayslipResult[] = [];

      for (const row of rows as EmployeeContractRecord[]) {
        const basicSalary = Number(row.basicSalary) || 0;
        const housingAllowance = Number(row.housingAllowance) || 0;
        const transportationAllowance = Number(row.transportationAllowance) || 0;
        const isSaudi = row.isSaudi ?? false;

        const grossSalary = basicSalary + housingAllowance + transportationAllowance;

        // GOSI calculation: Saudi 9.75% employee + 11.75% employer, Non-Saudi 0% + 11.75%
        const gosiEmployeeDeduction = isSaudi
          ? Math.round(grossSalary * GOSI_EMPLOYEE_SAUDI * 100) / 100
          : Math.round(grossSalary * GOSI_EMPLOYEE_NON_SAUDI * 100) / 100;
        const gosiEmployerContribution = isSaudi
          ? Math.round(grossSalary * GOSI_EMPLOYER_SAUDI * 100) / 100
          : Math.round(grossSalary * GOSI_EMPLOYER_NON_SAUDI * 100) / 100;

        const netSalary = Math.round((grossSalary - gosiEmployeeDeduction) * 100) / 100;

        payslips.push({
          employeeId: row.employeeId,
          grossSalary,
          gosiEmployeeDeduction,
          gosiEmployerContribution,
          netSalary,
        });

        this.logger.debug(
          `Payslip: employee=${row.employeeNumber} gross=${grossSalary} gosiEE=${gosiEmployeeDeduction} gosiER=${gosiEmployerContribution} net=${netSalary}`,
        );
      }

      this.logger.log(
        `Payroll run completed for tenant=${tenantSlug} period=${periodStart}..${periodEnd} employees=${payslips.length} processedBy=${processedBy}`,
      );
    } catch (err) {
      this.logger.error(
        `Payroll run failed for tenant=${tenantSlug} period=${periodStart}..${periodEnd}`,
        err,
      );
      throw err;
    }
  }
}
