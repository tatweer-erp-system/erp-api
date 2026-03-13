import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { EmployeeContract } from '../entities/employee-contract.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { ContractStatus } from '@/common/enums/hr.enums';

@Injectable()
export class EmployeeContractsRepository extends BaseRepository<EmployeeContract> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(EmployeeContract, true);
  }

  async findActiveByEmployee(
    tenantId: string,
    employeeId: string,
    transaction?: Transaction,
  ): Promise<EmployeeContract | null> {
    return this.findOne({
      where: { employeeId, status: ContractStatus.ACTIVE },
      tenantId,
      transaction,
    });
  }

  /**
   * Find contracts expiring within the given days from today.
   * Used by the contract-expiry alert cron job.
   */
  async findExpiringContracts(tenantId: string, daysAhead: number): Promise<EmployeeContract[]> {
    const results = await this.rawQuery<EmployeeContract[]>(
      `SELECT * FROM employee_contracts
       WHERE "tenantId" = :tenantId
         AND status = :status
         AND "endDate" IS NOT NULL
         AND "endDate" = (CURRENT_DATE + :daysAhead * INTERVAL '1 day')::date
         AND "deletedAt" IS NULL`,
      { tenantId, status: ContractStatus.ACTIVE, daysAhead },
    );
    return results;
  }
}
