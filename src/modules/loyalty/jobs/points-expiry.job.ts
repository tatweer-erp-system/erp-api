import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { LoyaltyTransactionsRepository } from '@/database/sql/repositories/loyalty-transactions.repository';
import { LoyaltyAccountsRepository } from '@/database/sql/repositories/loyalty-accounts.repository';
import { LoyaltyTransactionType } from '@/common/enums/loyalty.enums';

interface ExpiredAccountRow {
  account_id: string;
  customer_id: string;
  balance_points: string;
  expiry_date: string;
}

@Injectable()
export class PointsExpiryJob {
  private readonly logger = new Logger(PointsExpiryJob.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly loyaltyTransactionsRepository: LoyaltyTransactionsRepository,
    private readonly loyaltyAccountsRepository: LoyaltyAccountsRepository,
  ) {}

  /**
   * Runs daily at 03:00 UTC.
   * Finds loyalty accounts whose expiry_date has passed and balance_points > 0.
   * Creates an EXPIRE transaction and zeroes the balance.
   */
  @Cron('0 0 3 * * *')
  async handlePointsExpiry(): Promise<void> {
    this.logger.log('Starting loyalty points expiry job...');

    const expiredRows: ExpiredAccountRow[] = await this.dataSource.query(
      `SELECT id AS account_id,
              customer_id,
              balance_points,
              expiry_date
       FROM loyalty_accounts
       WHERE deleted_at IS NULL
         AND is_active = true
         AND expiry_date IS NOT NULL
         AND expiry_date < CURRENT_DATE
         AND balance_points > 0`,
    );

    if (expiredRows.length === 0) {
      this.logger.log('Points expiry job completed: no accounts to expire.');
      return;
    }

    let totalExpired = 0;

    for (const row of expiredRows) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const pointsToExpire = parseFloat(row.balance_points);
        if (pointsToExpire <= 0) {
          await queryRunner.release();
          continue;
        }

        // Zero out balance atomically
        await queryRunner.query(
          `UPDATE loyalty_accounts
           SET balance_points = 0,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1`,
          [row.account_id],
        );

        // Record EXPIRE transaction
        await this.loyaltyTransactionsRepository.create({
          accountId: row.account_id,
          customerId: row.customer_id,
          transactionType: LoyaltyTransactionType.EXPIRE,
          points: -pointsToExpire,
          balanceAfter: 0,
          notes: 'Points expired — expiry date reached',
        });

        await queryRunner.commitTransaction();
        totalExpired++;

        this.logger.debug(`Expired ${pointsToExpire} points for account ${row.account_id}`);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.warn(
          `Failed to expire points for account ${row.account_id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        await queryRunner.release();
      }
    }

    this.logger.log(`Points expiry job completed: ${totalExpired} account(s) expired.`);
  }
}
