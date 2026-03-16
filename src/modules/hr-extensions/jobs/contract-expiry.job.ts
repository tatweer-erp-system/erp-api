import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { EmployeeContractsRepository } from '@/database/sql/repositories/employee-contracts.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { ContractStatus } from '@/common/enums/hr.enums';
import { TenantStatus } from '@/common/enums/tenant.enums';

@Injectable()
export class ContractExpiryJob {
  private readonly logger = new Logger(ContractExpiryJob.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly contractsRepository: EmployeeContractsRepository,
    private readonly outboxService: OutboxSharedService,
  ) {}

  /**
   * Runs daily at 22:00 UTC (01:00 AST next day).
   * Finds active contracts where endDate < today and sets status to EXPIRED.
   * Creates outbox events for notifications.
   */
  @Cron('0 0 22 * * *')
  async handleContractExpiry(): Promise<void> {
    this.logger.log('Starting contract expiry job...');

    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    const [tenants] = await sharedSequelize.query(
      `SELECT id FROM tenants WHERE status IN (:active, :trial) AND "deletedAt" IS NULL ORDER BY id ASC`,
      { replacements: { active: TenantStatus.ACTIVE, trial: TenantStatus.TRIAL } },
    );

    const tenantList = tenants as { id: string }[];
    let totalExpired = 0;

    for (const tenant of tenantList) {
      try {
        const expired = await this.processContractsForTenant(tenant.id);
        totalExpired += expired;
      } catch (err) {
        this.logger.error(
          `Failed to process contract expiry for tenant ${tenant.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `Contract expiry job completed: ${totalExpired} contract(s) expired across ${tenantList.length} tenant(s)`,
    );
  }

  private async processContractsForTenant(tenantId: string): Promise<number> {
    const expiredContracts = await this.contractsRepository.rawQuery(
      `SELECT id, "employeeId", "endDate" FROM employee_contracts
       WHERE "tenantId" = :tenantId
         AND status = :activeStatus
         AND "endDate" IS NOT NULL
         AND "endDate" < CURRENT_DATE
         AND "deletedAt" IS NULL`,
      { tenantId, activeStatus: ContractStatus.ACTIVE },
    );

    if (expiredContracts.length === 0) return 0;

    for (const contract of expiredContracts) {
      const sequelize = this.contractsRepository.getSequelize();
      const transaction = await sequelize.transaction();

      try {
        await this.contractsRepository.update(
          contract.id,
          { status: ContractStatus.EXPIRED } as any,
          { tenantId, transaction },
        );

        await this.outboxService.createEvent({
          tenantId,
          eventType: 'contract_expired',
          payload: {
            contractId: contract.id,
            employeeId: contract.employeeId,
            endDate: contract.endDate,
          },
          referenceId: contract.id,
          referenceType: 'employee_contract',
          transaction,
        });

        await transaction.commit();

        this.logger.debug(
          `Contract ${contract.id} for employee ${contract.employeeId} expired in tenant ${tenantId}`,
        );
      } catch (err) {
        await transaction.rollback();
        this.logger.warn(
          `Failed to expire contract ${contract.id} in tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return expiredContracts.length;
  }
}
