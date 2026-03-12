import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { SequencesRepository } from '@/database/sql/repositories/sequences.repository';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';

@Injectable()
export class EmployeeEventHandler implements IEventHandler {
  private readonly logger = new Logger(EmployeeEventHandler.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly employeesRepository: EmployeesRepository,
    private readonly sequencesRepository: SequencesRepository,
  ) {}

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.event_type) {
      case 'employee.created':
        await this.handleCreated(event.tenant_id, payload);
        break;
      default:
        this.logger.warn(`Unhandled employee event type: ${event.event_type}`);
    }
  }

  private async handleCreated(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const employeeId = payload.employeeId as string;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      // Check if employee already has a number
      const employee = await this.employeesRepository.findOneById(tenantId, employeeId);
      if (!employee) {
        this.logger.warn(`Employee ${employeeId} not found in tenant ${tenantId}`);
        await transaction.rollback();
        return;
      }

      if (employee.employee_number) {
        this.logger.log(
          `Employee ${employeeId} already has number ${employee.employee_number}, skipping`,
        );
        await transaction.rollback();
        return;
      }

      // Generate employee number via SequenceService
      const sequence = await this.sequencesRepository.findForUpdate(
        tenantId,
        'employee',
        null,
        transaction,
      );

      if (sequence) {
        const nextValue = await this.sequencesRepository.incrementAndGet(
          (sequence as any).id,
          null,
          transaction,
        );

        const employeeNumber = `EMP-${String(nextValue).padStart(5, '0')}`;

        await this.employeesRepository.updateEmployee(
          tenantId,
          employeeId,
          ['employee_number = :employeeNumber', 'updated_at = NOW()'],
          { id: employeeId, employeeNumber },
        );

        this.logger.log(`Generated employee number ${employeeNumber} for employee ${employeeId}`);
      } else {
        this.logger.warn(
          `No employee sequence found for tenant ${tenantId}, skipping number generation`,
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
