import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_PAYROLL } from '@/infrastructure/queues/queue.constants';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';

export interface PayrollJobData {
  tenantSlug: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  processedBy: string;
}

interface EmployeeRecord {
  id: string;
  employee_number: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
}

interface PayslipResult {
  employeeId: string;
  grossSalary: number;
  gosiDeduction: number;
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

      const [employees] = await sequelize.query(
        `SELECT id, employee_number, basic_salary, housing_allowance, transport_allowance
         FROM employees
         WHERE tenant_id = :tenantId
           AND status = 'active'
         ORDER BY employee_number ASC`,
        { replacements: { tenantId } },
      );

      const payslips: PayslipResult[] = [];

      for (const row of employees as EmployeeRecord[]) {
        const basicSalary = Number(row.basic_salary) || 0;
        const housingAllowance = Number(row.housing_allowance) || 0;
        const transportAllowance = Number(row.transport_allowance) || 0;

        const grossSalary = basicSalary + housingAllowance + transportAllowance;

        // GOSI employee share: 9.75% of basic salary, capped at 45,000 SAR base
        const gosiBase = Math.min(basicSalary, 45000);
        const gosiDeduction = Math.round(gosiBase * 0.0975 * 100) / 100;

        const netSalary = Math.round((grossSalary - gosiDeduction) * 100) / 100;

        payslips.push({
          employeeId: row.id,
          grossSalary,
          gosiDeduction,
          netSalary,
        });

        // TODO: Insert payslip records (Phase 2 - payslip table)
        this.logger.debug(
          `Payslip: employee=${row.employee_number} gross=${grossSalary} gosi=${gosiDeduction} net=${netSalary}`,
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
