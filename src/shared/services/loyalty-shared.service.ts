import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyAccount } from '@/database/sql/entities/loyalty-account.entity';
import { LoyaltyProgram } from '@/database/sql/entities/loyalty-program.entity';
import { LoyaltyTransaction } from '@/database/sql/entities/loyalty-transaction.entity';
import { LoyaltyTier } from '@/database/sql/entities/loyalty-tier.entity';
import { LoyaltyTransactionType } from '@/common/enums/loyalty.enums';

/**
 * LoyaltySharedService — used by other modules (e.g. POS) that cannot import LoyaltyModule.
 * Operates directly on TypeORM repositories to avoid cross-module imports.
 */
@Injectable()
export class LoyaltySharedService {
  constructor(
    @InjectRepository(LoyaltyAccount)
    private readonly accountRepo: Repository<LoyaltyAccount>,
    @InjectRepository(LoyaltyProgram)
    private readonly programRepo: Repository<LoyaltyProgram>,
    @InjectRepository(LoyaltyTransaction)
    private readonly txnRepo: Repository<LoyaltyTransaction>,
    @InjectRepository(LoyaltyTier)
    private readonly tierRepo: Repository<LoyaltyTier>,
  ) {}

  /**
   * Earn points for an order. Tip is excluded — pass order total before tip.
   */
  async earn(
    _tenantId: string,
    customerId: string,
    orderId: string,
    orderTotal: number,
    _transaction?: unknown,
  ): Promise<void> {
    const accounts = await this.accountRepo.find({ where: { customerId, isActive: true } as any });
    if (accounts.length === 0) return;

    for (const account of accounts) {
      const program = await this.programRepo.findOne({ where: { id: account.programId } as any });
      if (!program || !program.isActive) continue;

      const tier = account.tierId
        ? await this.tierRepo.findOne({ where: { id: account.tierId } as any })
        : null;
      const multiplier = tier ? Number(tier.bonusMultiplier) : 1;
      const pointsEarned = Math.floor(orderTotal * Number(program.pointsPerCurrency) * multiplier);
      if (pointsEarned <= 0) continue;

      const newBalance = Number(account.balancePoints) + pointsEarned;

      await this.accountRepo.update(account.id, {
        balancePoints: newBalance,
        lifetimePoints: Number(account.lifetimePoints) + pointsEarned,
      } as any);

      const txn = this.txnRepo.create({
        accountId: account.id,
        customerId,
        transactionType: LoyaltyTransactionType.EARN,
        points: pointsEarned,
        balanceAfter: newBalance,
        orderId,
        sourceModel: 'pos_order',
      } as any);
      await this.txnRepo.save(txn);
    }
  }

  /**
   * Redeem points — manual, cashier-initiated.
   */
  async redeem(
    _tenantId: string,
    customerId: string,
    orderId: string,
    requestedPoints: number,
    orderTotal: number,
    _transaction?: unknown,
  ): Promise<{ pointsUsed: number; sarValue: number }> {
    const accounts = await this.accountRepo.find({ where: { customerId, isActive: true } as any });
    if (accounts.length === 0) return { pointsUsed: 0, sarValue: 0 };

    const account = accounts[0];
    const program = await this.programRepo.findOne({ where: { id: account.programId } as any });
    if (!program) return { pointsUsed: 0, sarValue: 0 };

    const available = Number(account.balancePoints);
    if (available < Number(program.minRedeemPoints)) return { pointsUsed: 0, sarValue: 0 };

    const pointsToUse = Math.min(requestedPoints, available);
    const sarValue = pointsToUse * Number(program.currencyPerPoint);
    const effectiveSarValue = Math.min(sarValue, orderTotal);
    const effectivePoints = Math.ceil(effectiveSarValue / Number(program.currencyPerPoint));
    const newBalance = available - effectivePoints;

    await this.accountRepo.update(account.id, { balancePoints: newBalance } as any);

    const txn = this.txnRepo.create({
      accountId: account.id,
      customerId,
      transactionType: LoyaltyTransactionType.REDEEM,
      points: -effectivePoints,
      balanceAfter: newBalance,
      orderId,
      sourceModel: 'pos_order',
    } as any);
    await this.txnRepo.save(txn);

    return { pointsUsed: effectivePoints, sarValue: Math.round(effectiveSarValue * 100) / 100 };
  }

  /**
   * Reverses earn transactions for a given order (called on refund).
   */
  async reverseEarn(_tenantId: string, orderId: string, _transaction?: unknown): Promise<void> {
    const earnTxns = await this.txnRepo.find({
      where: { orderId, transactionType: LoyaltyTransactionType.EARN } as any,
    });

    for (const txn of earnTxns) {
      const account = await this.accountRepo.findOne({ where: { id: txn.accountId } as any });
      if (!account) continue;

      const pointsToReverse = Number(txn.points);
      const newBalance = Math.max(Number(account.balancePoints) - pointsToReverse, 0);

      await this.accountRepo.update(account.id, { balancePoints: newBalance } as any);

      const refundTxn = this.txnRepo.create({
        accountId: account.id,
        customerId: txn.customerId,
        transactionType: LoyaltyTransactionType.REFUND,
        points: -pointsToReverse,
        balanceAfter: newBalance,
        orderId,
        notes: `Refund reversal for order ${orderId}`,
      } as any);
      await this.txnRepo.save(refundTxn);
    }
  }
}
