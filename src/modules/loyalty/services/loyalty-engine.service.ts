import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
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
  ) {}

  /**
   * Earn loyalty points for an order.
   * Called by checkout — silently returns if no active program exists.
   */
  async earn(
    tenantId: string,
    customerId: string,
    orderId: string,
    orderTotal: number,
    transaction: Transaction,
  ): Promise<void> {
    // 1. Find active loyalty program for tenant
    const program = await this.programsRepository.findOne({
      tenantId,
      where: { isActive: true },
      transaction,
    });
    if (!program) return;

    // 2. Get or create loyalty account
    const [account] = await this.accountsRepository.findOrCreate(
      { customerId: customerId, programId: program.id },
      {
        customerId: customerId,
        programId: program.id,
        currentPoints: 0,
        lifetimePoints: 0,
        enrolledAt: new Date(),
        version: 0,
      },
      { tenantId, transaction },
    );

    // 3. Get current tier (highest tier where lifetime_points >= min_points)
    const tiers = await this.tiersRepository.findAllRaw({
      where: { programId: program.id },
      order: [['minPoints', 'DESC']],
      transaction,
    });
    const currentTier = tiers.find((t) => Number(account.lifetimePoints) >= Number(t.minPoints));
    const earnMultiplier = currentTier ? Number(currentTier.earnMultiplier) : 1.0;

    // 4. Calculate points (orderTotal excludes tipAmount)
    const points = Math.floor(orderTotal * Number(program.pointsPerCurrency) * earnMultiplier);
    if (points <= 0) return;

    // 5. Atomic update: current_points + lifetime_points
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

    // 6. Get updated account for balance_after
    const updatedAccount = await this.accountsRepository.findById(account.id, {
      tenantId,
      transaction,
    });

    // 7. Insert loyalty transaction
    const expiresAt = program.expiryDays
      ? new Date(Date.now() + Number(program.expiryDays) * 24 * 60 * 60 * 1000)
      : null;

    await this.transactionsRepository.create(
      {
        accountId: account.id,
        orderId: orderId,
        type: LoyaltyTransactionType.EARN,
        points,
        balanceAfter: updatedAccount.currentPoints,
        expiresAt: expiresAt,
      } as any,
      { transaction },
    );

    // 8. Recalculate tier based on updated lifetime_points
    const newTier = tiers.find((t) => Number(updatedAccount.lifetimePoints) >= Number(t.minPoints));
    const newTierId = newTier ? Number(newTier.id) : null;
    const currentTierId = currentTier ? Number(currentTier.id) : null;

    // 9. Update tier if changed
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
   * Called by checkout — returns the points used and SAR value.
   */
  async redeem(
    tenantId: string,
    customerId: string,
    orderId: string,
    requestedPoints: number,
    orderTotal: number,
    transaction: Transaction,
  ): Promise<{ pointsUsed: number; sarValue: number }> {
    // 1. Load loyalty account
    const account = await this.accountsRepository.findOne({
      tenantId,
      where: { customerId: customerId },
      transaction,
    });
    if (!account) {
      throw new NotFoundException(msg(ErrorMessages.LOYALTY_ACCOUNT_NOT_FOUND, customerId));
    }

    // 2. Load program
    const program = await this.programsRepository.findById(account.programId, {
      tenantId,
      transaction,
    });

    // 3. Calculate max points allowed by order cap
    const maxPointsAllowed = Math.floor(
      (orderTotal * Number(program.maxRedeemPct)) / 100 / Number(program.currencyPerPoint),
    );

    // 4. Determine actual points to use
    const pointsToUse = Math.min(requestedPoints, maxPointsAllowed, account.currentPoints);

    if (pointsToUse <= 0) {
      return { pointsUsed: 0, sarValue: 0 };
    }

    // 5. Calculate SAR value
    const sarValue = Math.round(pointsToUse * Number(program.currencyPerPoint) * 100) / 100;

    // 6. Verify sufficient balance
    if (account.currentPoints < pointsToUse) {
      throw new BadRequestException(
        msg(ErrorMessages.LOYALTY_INSUFFICIENT_POINTS, account.currentPoints, pointsToUse),
      );
    }

    // 7. Atomic deduction with optimistic check
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

    // 8. Get updated account for balance_after
    const updatedAccount = await this.accountsRepository.findById(account.id, {
      tenantId,
      transaction,
    });

    // 9. Insert loyalty transaction
    await this.transactionsRepository.create(
      {
        accountId: account.id,
        orderId: orderId,
        type: LoyaltyTransactionType.REDEEM,
        points: -pointsToUse,
        balanceAfter: updatedAccount.currentPoints,
      } as any,
      { transaction },
    );

    return { pointsUsed: pointsToUse, sarValue };
  }

  /**
   * Get loyalty account for a customer.
   */
  async getAccountByCustomer(tenantId: string, customerId: string) {
    const account = await this.accountsRepository.findOne({
      tenantId,
      where: { customerId: customerId },
    });
    if (!account) {
      throw new NotFoundException(msg(ErrorMessages.LOYALTY_ACCOUNT_NOT_FOUND, customerId));
    }

    // Enrich with tier info
    let tier = null;
    if (account.tierId) {
      tier = await this.tiersRepository.findByIdOrNull(String(account.tierId), {});
    }

    // Load program
    const program = await this.programsRepository.findByIdOrNull(account.programId, {
      tenantId,
    });

    return { ...account, tier, program };
  }

  /**
   * Get transaction history for an account.
   */
  async getTransactionHistory(tenantId: string, accountId: string, pagination: PaginationDto) {
    // Verify account exists and belongs to tenant
    await this.accountsRepository.findById(accountId, { tenantId });

    return this.transactionsRepository.findAll({
      where: { accountId: accountId },
      page: pagination.page,
      limit: pagination.limit,
      sortBy: pagination.sortBy ?? 'createdAt',
      sortOrder: pagination.sortOrder ?? 'DESC',
    });
  }

  /**
   * Manual point adjustment by manager.
   */
  async adjustPoints(tenantId: string, accountId: string, dto: AdjustPointsDto) {
    const isOwner = true;
    const transaction = await this.accountsRepository.createTransaction({});

    try {
      // Verify account exists and belongs to tenant
      const account = await this.accountsRepository.findById(accountId, {
        tenantId,
        transaction,
      });

      const isDeduction = dto.actionType === LoyaltyAdjustAction.DEDUCT;
      const pointsDelta = isDeduction ? -dto.points : dto.points;

      if (isDeduction) {
        // Atomic deduction with balance check
        const result = await this.accountsRepository.rawQuery<{ id: string }[]>(
          `UPDATE loyalty_accounts
           SET "currentPoints" = "currentPoints" - :points,
               "lastActivityAt" = NOW(),
               version = version + 1
           WHERE id = :accountId AND "currentPoints" >= :points
           RETURNING id`,
          { points: dto.points, accountId },
          transaction,
        );

        if (!result || result.length === 0) {
          throw new BadRequestException(
            msg(ErrorMessages.LOYALTY_INSUFFICIENT_POINTS, account.currentPoints, dto.points),
          );
        }
      } else {
        // Grant or correction — add points
        await this.accountsRepository.rawQuery(
          `UPDATE loyalty_accounts
           SET "currentPoints" = "currentPoints" + :points,
               "lifetimePoints" = "lifetimePoints" + :points,
               "lastActivityAt" = NOW(),
               version = version + 1
           WHERE id = :accountId`,
          { points: dto.points, accountId },
          transaction,
        );
      }

      // Get updated account for balance_after
      const updatedAccount = await this.accountsRepository.findById(accountId, {
        tenantId,
        transaction,
      });

      // Record transaction
      await this.transactionsRepository.create(
        {
          accountId: accountId,
          type: LoyaltyTransactionType.MANUAL,
          points: pointsDelta,
          balanceAfter: updatedAccount.currentPoints,
          description: `[${dto.actionType}] ${dto.notes}`,
        } as any,
        { transaction },
      );

      // Recalculate tier if points were added
      if (!isDeduction) {
        const program = await this.programsRepository.findById(account.programId, {
          tenantId,
          transaction,
        });
        const tiers = await this.tiersRepository.findAllRaw({
          where: { programId: program.id },
          order: [['minPoints', 'DESC']],
          transaction,
        });
        const newTier = tiers.find(
          (t) => Number(updatedAccount.lifetimePoints) >= Number(t.minPoints),
        );
        const newTierId = newTier ? Number(newTier.id) : null;
        const currentTierId = account.tierId ? Number(account.tierId) : null;

        if (newTierId !== currentTierId) {
          await this.accountsRepository.rawQuery(
            `UPDATE loyalty_accounts SET "tierId" = :tierId WHERE id = :accountId`,
            { tierId: newTierId, accountId },
            transaction,
          );
        }
      }

      if (isOwner) await transaction.commit();

      return this.accountsRepository.findById(accountId, { tenantId });
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }
}
