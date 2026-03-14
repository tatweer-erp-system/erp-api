import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { LoyaltyProgramsRepository } from '@/database/sql/repositories/loyalty-programs.repository';
import { LoyaltyAccountsRepository } from '@/database/sql/repositories/loyalty-accounts.repository';
import { LoyaltyTransactionsRepository } from '@/database/sql/repositories/loyalty-transactions.repository';
import { LoyaltyTiersRepository } from '@/database/sql/repositories/loyalty-tiers.repository';
import { LoyaltyTransactionType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class LoyaltySharedService {
  constructor(
    private readonly programsRepository: LoyaltyProgramsRepository,
    private readonly accountsRepository: LoyaltyAccountsRepository,
    private readonly transactionsRepository: LoyaltyTransactionsRepository,
    private readonly tiersRepository: LoyaltyTiersRepository,
  ) {}

  /**
   * Earn loyalty points for an order.
   * Silently returns if no active program exists.
   */
  async earn(
    tenantId: string,
    customerId: string,
    orderId: string,
    orderTotal: number,
    transaction: Transaction,
  ): Promise<void> {
    const program = await this.programsRepository.findOne({
      tenantId,
      where: { isActive: true },
      transaction,
    });
    if (!program) return;

    const [account] = await this.accountsRepository.findOrCreate(
      { customerId, programId: program.id },
      {
        customerId,
        programId: program.id,
        currentPoints: 0,
        lifetimePoints: 0,
        enrolledAt: new Date(),
        version: 0,
      },
      { tenantId, transaction },
    );

    const tiers = await this.tiersRepository.findAllRaw({
      where: { programId: program.id },
      order: [['minPoints', 'DESC']],
      transaction,
    });
    const currentTier = tiers.find((t) => Number(account.lifetimePoints) >= Number(t.minPoints));
    const earnMultiplier = currentTier ? Number(currentTier.earnMultiplier) : 1.0;

    const points = Math.floor(orderTotal * Number(program.pointsPerCurrency) * earnMultiplier);
    if (points <= 0) return;

    await this.accountsRepository.rawQuery(
      `UPDATE loyalty_accounts
       SET "currentPoints" = "currentPoints" + :points,
           "lifetimePoints" = "lifetimePoints" + :points,
           "lastActivityAt" = NOW(),
           version = version + 1
       WHERE id = :accountId`,
      { points, accountId: account.id },
      transaction,
    );

    const updatedAccount = await this.accountsRepository.findById(account.id, {
      tenantId,
      transaction,
    });

    const expiresAt = program.expiryDays
      ? new Date(Date.now() + Number(program.expiryDays) * 24 * 60 * 60 * 1000)
      : null;

    await this.transactionsRepository.create(
      {
        accountId: account.id,
        orderId,
        type: LoyaltyTransactionType.EARN,
        points,
        balanceAfter: updatedAccount.currentPoints,
        expiresAt,
      } as any,
      { transaction },
    );

    // Recalculate tier
    const newTier = tiers.find((t) => Number(updatedAccount.lifetimePoints) >= Number(t.minPoints));
    const newTierId = newTier ? Number(newTier.id) : null;
    const currentTierId = currentTier ? Number(currentTier.id) : null;

    if (newTierId !== currentTierId) {
      await this.accountsRepository.rawQuery(
        `UPDATE loyalty_accounts SET "tierId" = :tierId WHERE id = :accountId`,
        { tierId: newTierId, accountId: account.id },
        transaction,
      );
    }
  }

  /**
   * Redeem loyalty points for an order.
   * Returns the points used and SAR value.
   */
  async redeem(
    tenantId: string,
    customerId: string,
    orderId: string,
    requestedPoints: number,
    orderTotal: number,
    transaction: Transaction,
  ): Promise<{ pointsUsed: number; sarValue: number }> {
    const account = await this.accountsRepository.findOne({
      tenantId,
      where: { customerId },
      transaction,
    });
    if (!account) {
      throw new NotFoundException(msg(ErrorMessages.LOYALTY_ACCOUNT_NOT_FOUND, customerId));
    }

    const program = await this.programsRepository.findById(account.programId, {
      tenantId,
      transaction,
    });

    const maxPointsAllowed = Math.floor(
      (orderTotal * Number(program.maxRedeemPct)) / 100 / Number(program.currencyPerPoint),
    );

    const pointsToUse = Math.min(requestedPoints, maxPointsAllowed, account.currentPoints);

    if (pointsToUse <= 0) {
      return { pointsUsed: 0, sarValue: 0 };
    }

    const sarValue = Math.round(pointsToUse * Number(program.currencyPerPoint) * 100) / 100;

    if (account.currentPoints < pointsToUse) {
      throw new BadRequestException(
        msg(ErrorMessages.LOYALTY_INSUFFICIENT_POINTS, account.currentPoints, pointsToUse),
      );
    }

    const result = await this.accountsRepository.rawQuery<{ id: string }[]>(
      `UPDATE loyalty_accounts
       SET "currentPoints" = "currentPoints" - :points,
           "lastActivityAt" = NOW(),
           version = version + 1
       WHERE id = :accountId AND "currentPoints" >= :points
       RETURNING id`,
      { points: pointsToUse, accountId: account.id },
      transaction,
    );

    if (!result || result.length === 0) {
      throw new BadRequestException(
        msg(ErrorMessages.LOYALTY_INSUFFICIENT_POINTS, account.currentPoints, pointsToUse),
      );
    }

    const updatedAccount = await this.accountsRepository.findById(account.id, {
      tenantId,
      transaction,
    });

    await this.transactionsRepository.create(
      {
        accountId: account.id,
        orderId,
        type: LoyaltyTransactionType.REDEEM,
        points: -pointsToUse,
        balanceAfter: updatedAccount.currentPoints,
      } as any,
      { transaction },
    );

    return { pointsUsed: pointsToUse, sarValue };
  }

  /**
   * Reverse earned points on refund.
   */
  async reverseEarn(tenantId: string, orderId: string, transaction: Transaction): Promise<void> {
    const earnTx = await this.transactionsRepository.findOne({
      where: { orderId, type: LoyaltyTransactionType.EARN },
      transaction,
    });
    if (!earnTx) return;

    const earnData = earnTx as unknown as Record<string, unknown>;
    const pointsToReverse = Math.abs(parseFloat(String(earnData.points ?? 0)));
    if (pointsToReverse <= 0) return;

    const accountId = earnData.accountId as string;

    await this.accountsRepository.rawQuery(
      `UPDATE loyalty_accounts
       SET "currentPoints" = GREATEST("currentPoints" - :points, 0),
           "lastActivityAt" = NOW(),
           version = version + 1
       WHERE id = :accountId`,
      { points: pointsToReverse, accountId },
      transaction,
    );

    const updated = await this.accountsRepository.findById(accountId, { tenantId, transaction });

    await this.transactionsRepository.create(
      {
        accountId,
        orderId,
        type: LoyaltyTransactionType.REFUND,
        points: -pointsToReverse,
        balanceAfter: (updated as any).currentPoints,
      } as any,
      { transaction },
    );
  }
}
