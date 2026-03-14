import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { LoyaltyProgramsRepository } from '@/database/sql/repositories/loyalty-programs.repository';
import { LoyaltyAccountsRepository } from '@/database/sql/repositories/loyalty-accounts.repository';
import { LoyaltyTransactionsRepository } from '@/database/sql/repositories/loyalty-transactions.repository';
import { LoyaltyTiersRepository } from '@/database/sql/repositories/loyalty-tiers.repository';
import { LoyaltySharedService } from '@/shared/services/loyalty-shared.service';
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
    private readonly loyaltyShared: LoyaltySharedService,
  ) {}

  /** Delegate to shared service */
  async earn(
    tenantId: string,
    customerId: string,
    orderId: string,
    orderTotal: number,
    transaction: Transaction,
  ): Promise<void> {
    return this.loyaltyShared.earn(tenantId, customerId, orderId, orderTotal, transaction);
  }

  /** Delegate to shared service */
  async redeem(
    tenantId: string,
    customerId: string,
    orderId: string,
    requestedPoints: number,
    orderTotal: number,
    transaction: Transaction,
  ): Promise<{ pointsUsed: number; sarValue: number }> {
    return this.loyaltyShared.redeem(
      tenantId,
      customerId,
      orderId,
      requestedPoints,
      orderTotal,
      transaction,
    );
  }

  /** Delegate to shared service */
  async reverseEarn(tenantId: string, orderId: string, transaction: Transaction): Promise<void> {
    return this.loyaltyShared.reverseEarn(tenantId, orderId, transaction);
  }

  async getAccountByCustomer(tenantId: string, customerId: string) {
    const account = await this.accountsRepository.findOne({
      tenantId,
      where: { customerId },
    });
    if (!account) {
      throw new NotFoundException(msg(ErrorMessages.LOYALTY_ACCOUNT_NOT_FOUND, customerId));
    }

    let tier = null;
    if (account.tierId) {
      tier = await this.tiersRepository.findByIdOrNull(String(account.tierId), {});
    }

    const program = await this.programsRepository.findByIdOrNull(account.programId, {
      tenantId,
    });

    return { ...account, tier, program };
  }

  async getTransactionHistory(tenantId: string, accountId: string, pagination: PaginationDto) {
    await this.accountsRepository.findById(accountId, { tenantId });

    return this.transactionsRepository.findAll({
      where: { accountId },
      page: pagination.page,
      limit: pagination.limit,
      sortBy: pagination.sortBy ?? 'createdAt',
      sortOrder: pagination.sortOrder ?? 'DESC',
    });
  }

  async adjustPoints(tenantId: string, accountId: string, dto: AdjustPointsDto) {
    const isOwner = true;
    const transaction = await this.accountsRepository.createTransaction({});

    try {
      const account = await this.accountsRepository.findById(accountId, {
        tenantId,
        transaction,
      });

      const isDeduction = dto.actionType === LoyaltyAdjustAction.DEDUCT;
      const pointsDelta = isDeduction ? -dto.points : dto.points;

      if (isDeduction) {
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

      const updatedAccount = await this.accountsRepository.findById(accountId, {
        tenantId,
        transaction,
      });

      await this.transactionsRepository.create(
        {
          accountId,
          type: LoyaltyTransactionType.MANUAL,
          points: pointsDelta,
          balanceAfter: updatedAccount.currentPoints,
          description: `[${dto.actionType}] ${dto.notes}`,
        } as any,
        { transaction },
      );

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
