import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Transaction } from 'sequelize';
import { GiftCardsRepository } from '@/database/sql/repositories/gift-cards.repository';
import { GiftCardTransactionsRepository } from '@/database/sql/repositories/gift-card-transactions.repository';
import { IssueGiftCardDto } from '../dto/issue-gift-card.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { GiftCardTransactionType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

export interface GiftCardRedeemResult {
  amountDeducted: number;
  remainingToPay: number;
}

@Injectable()
export class GiftCardsService {
  constructor(
    private readonly giftCardsRepository: GiftCardsRepository,
    private readonly giftCardTransactionsRepository: GiftCardTransactionsRepository,
  ) {}

  private generateCode(): string {
    const bytes = randomBytes(12);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  async issue(tenantId: string, dto: IssueGiftCardDto, auditContext: AuditContext) {
    const isOwner = true;
    const transaction = await this.giftCardsRepository.createTransaction({});

    try {
      const code = this.generateCode();
      const initialBalance = dto.initialBalance;

      const giftCard = await this.giftCardsRepository.create(
        {
          code,
          initialBalance,
          currentBalance: initialBalance,
          currency: dto.currency ?? 'SAR',
          recipientName: dto.recipientName ?? null,
          recipientEmail: dto.recipientEmail ?? null,
          recipientPhone: dto.recipientPhone ?? null,
          issuedBy: auditContext.userId!,
          issuedOrderId: dto.issuedOrderId ?? null,
          issuedAt: new Date(),
          expiresAt: dto.expiresAt ?? null,
          isActive: true,
        } as any,
        { tenantId, auditContext, transaction },
      );

      await this.giftCardTransactionsRepository.create(
        {
          giftCardId: giftCard.id,
          orderId: dto.issuedOrderId ?? null,
          type: GiftCardTransactionType.ISSUE,
          amount: initialBalance,
          balanceAfter: initialBalance,
          createdBy: auditContext.userId ?? null,
        } as any,
        { transaction },
      );

      if (isOwner) await transaction.commit();
      return giftCard;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async createTransaction() {
    return this.giftCardsRepository.createTransaction({});
  }

  async checkBalance(code: string, tenantId: string) {
    const card = await this.giftCardsRepository.findOne({
      tenantId,
      where: { code },
    });

    if (!card) {
      throw new NotFoundException(msg(ErrorMessages.GIFT_CARD_NOT_FOUND, code));
    }

    return {
      currentBalance: parseFloat(String(card.currentBalance)),
      expiresAt: card.expiresAt,
      isActive: card.isActive,
    };
  }

  async redeem(
    tenantId: string,
    code: string,
    amount: number,
    orderId: string | null,
    auditContext: AuditContext,
    containerTransaction: Transaction,
  ): Promise<GiftCardRedeemResult> {
    // 1. Find card
    const card = await this.giftCardsRepository.findOne({
      tenantId,
      where: { code },
      transaction: containerTransaction,
    });
    if (!card) {
      throw new NotFoundException(msg(ErrorMessages.GIFT_CARD_NOT_FOUND, code));
    }

    // 2. Check active
    if (!card.isActive) {
      throw new BadRequestException(msg(ErrorMessages.GIFT_CARD_INACTIVE));
    }

    // 3. Check expiry
    if (card.expiresAt) {
      const today = new Date().toISOString().split('T')[0];
      if (today > card.expiresAt) {
        throw new BadRequestException(msg(ErrorMessages.GIFT_CARD_EXPIRED));
      }
    }

    // 4. Calculate deduction
    const currentBalance = parseFloat(String(card.currentBalance));
    const amountToDeduct = Math.min(amount, currentBalance);
    const remainingToPay = Math.round((amount - amountToDeduct) * 100) / 100;

    if (amountToDeduct <= 0) {
      return { amountDeducted: 0, remainingToPay: amount };
    }

    // 5. Atomic balance update — try full deduction first
    const fullDeductResult = await this.giftCardsRepository.rawQuery<{ id: string }[]>(
      `UPDATE "giftCards"
       SET "currentBalance" = "currentBalance" - :amount,
           version = version + 1
       WHERE id = :cardId
         AND "currentBalance" >= :amount
         AND "deletedAt" IS NULL
       RETURNING id`,
      { amount: amountToDeduct, cardId: card.id },
      containerTransaction,
    );

    let actualDeducted = amountToDeduct;
    let balanceAfter = currentBalance - amountToDeduct;

    if (!fullDeductResult || fullDeductResult.length === 0) {
      // Partial deduction — take whatever is available
      const partialResult = await this.giftCardsRepository.rawQuery<{ currentBalance: string }[]>(
        `UPDATE "giftCards"
         SET "currentBalance" = 0,
             version = version + 1
         WHERE id = :cardId
           AND "currentBalance" > 0
           AND "deletedAt" IS NULL
         RETURNING "currentBalance"`,
        { cardId: card.id },
        containerTransaction,
      );

      if (!partialResult || partialResult.length === 0) {
        return { amountDeducted: 0, remainingToPay: amount };
      }

      // The RETURNING current_balance gives us the value AFTER update (0)
      // We need to calculate what was actually deducted
      actualDeducted = currentBalance;
      balanceAfter = 0;
    }

    // 6. Insert transaction record
    await this.giftCardTransactionsRepository.create(
      {
        giftCardId: card.id,
        orderId: orderId ?? null,
        type: GiftCardTransactionType.REDEEM,
        amount: -actualDeducted,
        balanceAfter: Math.round(balanceAfter * 100) / 100,
        createdBy: auditContext.userId ?? null,
      } as any,
      { transaction: containerTransaction },
    );

    return {
      amountDeducted: Math.round(actualDeducted * 100) / 100,
      remainingToPay: Math.round((amount - actualDeducted) * 100) / 100,
    };
  }
}
