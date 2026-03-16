import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { LoyaltyProgramsRepository } from '@/database/sql/repositories/loyalty-programs.repository';
import { LoyaltyAccountsRepository } from '@/database/sql/repositories/loyalty-accounts.repository';
import { LoyaltyTransactionsRepository } from '@/database/sql/repositories/loyalty-transactions.repository';
import { LoyaltyTiersRepository } from '@/database/sql/repositories/loyalty-tiers.repository';
import { AdjustPointsDto } from '../dto/adjust-points.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { LoyaltyTransactionType, LoyaltyAdjustAction } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class LoyaltyEngineService {
  constructor(
    private readonly programsRepository: LoyaltyProgramsRepository,
    private readonly accountsRepository: LoyaltyAccountsRepository,
    private readonly transactionsRepository: LoyaltyTransactionsRepository,
    private readonly tiersRepository: LoyaltyTiersRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Earn points for a customer after a completed order.
   * Tip is excluded — points are earned on order total before tip.
   */
  async earn(
    _tenantId: string,
    customerId: string,
    orderId: string,
    orderTotal: number,
  ): Promise<void> {
    const accounts = await this.accountsRepository.findByCustomer(customerId);
    if (accounts.length === 0) return;

    for (const account of accounts) {
      const program = await this.programsRepository.findByIdOrNull(account.programId);
      if (!program || !program.isActive) continue;

      const tier = account.tierId
        ? await this.tiersRepository.findByIdOrNull(account.tierId)
        : null;
      const multiplier = tier ? Number(tier.bonusMultiplier) : 1;
      const pointsEarned = Math.floor(orderTotal * Number(program.pointsPerCurrency) * multiplier);
      if (pointsEarned <= 0) continue;

      const newBalance = Number(account.balancePoints) + pointsEarned;
      await this.accountsRepository.updateBalance(account.id, pointsEarned, newBalance);

      await this.transactionsRepository.create({
        accountId: account.id,
        customerId,
        transactionType: LoyaltyTransactionType.EARN,
        points: pointsEarned,
        balanceAfter: newBalance,
        orderId,
        sourceModel: 'pos_order',
      });

      await this._updateTierIfNeeded(account.id, account.programId, newBalance);
    }
  }

  /**
   * Redeem points manually — cashier-initiated, never automatic.
   */
  async redeem(
    _tenantId: string,
    customerId: string,
    orderId: string,
    requestedPoints: number,
    orderTotal: number,
  ): Promise<{ pointsUsed: number; sarValue: number }> {
    const accounts = await this.accountsRepository.findByCustomer(customerId);
    if (accounts.length === 0) {
      throw new NotFoundException(msg(ErrorMessages.LOYALTY_ACCOUNT_NOT_FOUND, customerId));
    }

    const account = accounts[0];
    const program = await this.programsRepository.findById(account.programId);

    if (Number(account.balancePoints) < Number(program.minRedeemPoints)) {
      throw new BadRequestException(
        msg(
          ErrorMessages.LOYALTY_INSUFFICIENT_POINTS,
          account.balancePoints,
          program.minRedeemPoints,
        ),
      );
    }

    const pointsToUse = Math.min(requestedPoints, Number(account.balancePoints));
    const sarValue = Math.round(pointsToUse * Number(program.currencyPerPoint) * 100) / 100;

    // Ensure redeemed value does not exceed order total
    const effectiveSarValue = Math.min(sarValue, orderTotal);
    const effectivePoints = Math.ceil(effectiveSarValue / Number(program.currencyPerPoint));

    const newBalance = Number(account.balancePoints) - effectivePoints;
    await this.accountsRepository.updateBalance(account.id, -effectivePoints, newBalance);

    await this.transactionsRepository.create({
      accountId: account.id,
      customerId,
      transactionType: LoyaltyTransactionType.REDEEM,
      points: -effectivePoints,
      balanceAfter: newBalance,
      orderId,
      sourceModel: 'pos_order',
    });

    return { pointsUsed: effectivePoints, sarValue: effectiveSarValue };
  }

  /**
   * Reverses earn transactions for a given order (used on refund).
   * Points reversal is automatic on refund.
   */
  async reverseEarn(_tenantId: string, orderId: string): Promise<void> {
    const earnTxns = await this.transactionsRepository.findByOrder(orderId);
    const earnOnly = earnTxns.filter((t) => t.transactionType === LoyaltyTransactionType.EARN);

    for (const txn of earnOnly) {
      const account = await this.accountsRepository.findByIdOrNull(txn.accountId);
      if (!account) continue;

      const pointsToReverse = Number(txn.points);
      const newBalance = Math.max(Number(account.balancePoints) - pointsToReverse, 0);

      await this.accountsRepository.updateBalance(account.id, -pointsToReverse, newBalance);

      await this.transactionsRepository.create({
        accountId: account.id,
        customerId: txn.customerId,
        transactionType: LoyaltyTransactionType.REFUND,
        points: -pointsToReverse,
        balanceAfter: newBalance,
        orderId,
        notes: `Refund reversal for order ${orderId}`,
      });
    }
  }

  async getAccountByCustomer(_tenantId: string, customerId: string) {
    const accounts = await this.accountsRepository.findByCustomer(customerId);
    if (accounts.length === 0) {
      throw new NotFoundException(msg(ErrorMessages.LOYALTY_ACCOUNT_NOT_FOUND, customerId));
    }

    const account = accounts[0];
    const tier = account.tierId ? await this.tiersRepository.findByIdOrNull(account.tierId) : null;
    const program = await this.programsRepository.findByIdOrNull(account.programId);

    return { ...account, tier, program };
  }

  async getTransactionHistory(_tenantId: string, accountId: string, pagination: PaginationDto) {
    await this.accountsRepository.findById(accountId);
    return this.transactionsRepository.findByAccount(
      accountId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  async adjustPoints(_tenantId: string, accountId: string, dto: AdjustPointsDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await this.accountsRepository.findById(accountId);
      const isDeduction = dto.actionType === LoyaltyAdjustAction.DEDUCT;
      const pointsDelta = isDeduction ? -dto.points : dto.points;

      if (isDeduction) {
        if (Number(account.balancePoints) < dto.points) {
          throw new BadRequestException(
            msg(ErrorMessages.LOYALTY_INSUFFICIENT_POINTS, account.balancePoints, dto.points),
          );
        }
      }

      const newBalance = Number(account.balancePoints) + pointsDelta;
      await this.accountsRepository.updateBalance(account.id, pointsDelta, newBalance);

      await this.transactionsRepository.create({
        accountId,
        customerId: account.customerId,
        transactionType: LoyaltyTransactionType.MANUAL,
        points: pointsDelta,
        balanceAfter: newBalance,
        notes: `[${dto.actionType}] ${dto.notes}`,
      });

      if (!isDeduction) {
        const updatedAccount = await this.accountsRepository.findById(accountId);
        await this._updateTierIfNeeded(
          accountId,
          account.programId,
          Number(updatedAccount.lifetimePoints),
        );
      }

      await queryRunner.commitTransaction();
      return this.accountsRepository.findById(accountId);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async _updateTierIfNeeded(
    accountId: string,
    programId: string,
    lifetimePoints: number,
  ): Promise<void> {
    const tiers = await this.tiersRepository.findAllByProgramDesc(programId);
    const newTier = tiers.find((t) => lifetimePoints >= Number(t.minPoints));
    const account = await this.accountsRepository.findById(accountId);

    const newTierId = newTier ? newTier.id : null;
    if (newTierId !== account.tierId) {
      await this.dataSource.query(
        `UPDATE loyalty_accounts SET tier_id = $1, updated_at = NOW() WHERE id = $2`,
        [newTierId, accountId],
      );
    }
  }
}
