import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { LoyaltyTransactionsRepository } from '@/database/sql/repositories/loyalty-transactions.repository';
import { LoyaltyAccountsRepository } from '@/database/sql/repositories/loyalty-accounts.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { LoyaltyTransactionType } from '@/common/enums/pos.enums';
import { TenantStatus } from '@/common/enums/tenant.enums';

interface ExpiredPointsRow {
  accountId: string;
  totalExpiredPoints: string;
  customerId: string;
  tenantId: string;
}

@Injectable()
export class PointsExpiryJob {
  private readonly logger = new Logger(PointsExpiryJob.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly loyaltyTransactionsRepository: LoyaltyTransactionsRepository,
    private readonly loyaltyAccountsRepository: LoyaltyAccountsRepository,
    private readonly outboxService: OutboxSharedService,
  ) {}

  /**
   * Runs daily at 03:00 UTC.
   * Finds EARN transactions where expiresAt < today and no corresponding EXPIRE transaction exists.
   * Groups by account, creates EXPIRE transaction, and atomically reduces account balance.
   */
  @Cron('0 0 3 * * *')
  async handlePointsExpiry(): Promise<void> {
    this.logger.log('Starting loyalty points expiry job...');

    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    const [tenants] = await sharedSequelize.query(
      `SELECT id FROM tenants WHERE status IN (:active, :trial) AND "deletedAt" IS NULL ORDER BY id ASC`,
      { replacements: { active: TenantStatus.ACTIVE, trial: TenantStatus.TRIAL } },
    );

    const tenantList = tenants as { id: string }[];
    let totalExpired = 0;

    for (const tenant of tenantList) {
      try {
        const expired = await this.processPointsForTenant(tenant.id);
        totalExpired += expired;
      } catch (err) {
        this.logger.error(
          `Failed to process points expiry for tenant ${tenant.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `Points expiry job completed: ${totalExpired} account(s) had points expired across ${tenantList.length} tenant(s)`,
    );
  }

  private async processPointsForTenant(tenantId: string): Promise<number> {
    const sequelize = this.loyaltyTransactionsRepository.getSequelize();

    // Find EARN transactions that have expired and have no corresponding EXPIRE transaction,
    // grouped by account with total points to expire.
    const [expiredRows] = await sequelize.query(
      `SELECT
         lt."accountId",
         SUM(lt.points) AS "totalExpiredPoints",
         la."customerId",
         la."tenantId"
       FROM loyalty_transactions lt
       JOIN loyalty_accounts la ON la.id = lt."accountId" AND la."tenantId" = :tenantId
       WHERE lt.type = :earnType
         AND lt."expiresAt" IS NOT NULL
         AND lt."expiresAt" < CURRENT_TIMESTAMP
         AND NOT EXISTS (
           SELECT 1 FROM loyalty_transactions lt2
           WHERE lt2."accountId" = lt."accountId"
             AND lt2.type = :expireType
             AND lt2.description LIKE '%expired%'
             AND lt2."createdAt" >= lt."expiresAt"
             AND lt2.points = lt.points
         )
       GROUP BY lt."accountId", la."customerId", la."tenantId"
       HAVING SUM(lt.points) > 0`,
      {
        replacements: {
          tenantId,
          earnType: LoyaltyTransactionType.EARN,
          expireType: LoyaltyTransactionType.EXPIRE,
        },
      },
    );

    const rows = expiredRows as ExpiredPointsRow[];
    if (rows.length === 0) return 0;

    for (const row of rows) {
      const pointsToExpire = parseInt(row.totalExpiredPoints, 10);
      if (pointsToExpire <= 0) continue;

      const transaction = await sequelize.transaction();

      try {
        // Atomically reduce account balance — ensure it does not go below 0
        const [updateResult] = await sequelize.query(
          `UPDATE loyalty_accounts
           SET "currentPoints" = GREATEST("currentPoints" - :points, 0),
               "lastActivityAt" = NOW(),
               version = version + 1,
               "updatedAt" = NOW()
           WHERE id = :accountId AND "tenantId" = :tenantId
           RETURNING "currentPoints"`,
          {
            replacements: { points: pointsToExpire, accountId: row.accountId, tenantId },
            transaction,
          },
        );

        const balanceAfter = (updateResult as { currentPoints: number }[])[0]?.currentPoints ?? 0;

        // Create EXPIRE transaction
        await this.loyaltyTransactionsRepository.create(
          {
            accountId: row.accountId,
            orderId: null,
            type: LoyaltyTransactionType.EXPIRE,
            points: pointsToExpire,
            balanceAfter,
            description: 'Points expired due to inactivity/time limit',
            expiresAt: null,
          } as any,
          { bypassTenantScope: true, transaction },
        );

        // Create outbox event for notification
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'loyalty_points_expired',
          payload: {
            accountId: row.accountId,
            customerId: row.customerId,
            points: pointsToExpire,
            balanceAfter,
          },
          referenceId: row.accountId,
          referenceType: 'loyalty_account',
          transaction,
        });

        await transaction.commit();

        this.logger.debug(
          `Expired ${pointsToExpire} points for account ${row.accountId} in tenant ${tenantId}. Balance after: ${balanceAfter}`,
        );
      } catch (err) {
        await transaction.rollback();
        this.logger.warn(
          `Failed to expire points for account ${row.accountId} in tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return rows.length;
  }
}
