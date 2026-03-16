import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';

import { GiftCardsRepository } from '@/database/sql/repositories/gift-cards.repository';
import { GiftCardTransactionsRepository } from '@/database/sql/repositories/gift-card-transactions.repository';
import { IssueGiftCardDto } from '../dto/issue-gift-card.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { GiftCardStatus } from '@/common/enums/loyalty.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { GiftCardRedeemResult } from '../interfaces/vouchers-gift-cards.interfaces';

const GC_TXN_ISSUE = 'issue';
const GC_TXN_REDEEM = 'redeem';
const GC_TXN_REFUND = 'refund';

@Injectable()
export class GiftCardsService {
  constructor(
    private readonly giftCardsRepository: GiftCardsRepository,
    private readonly giftCardTransactionsRepository: GiftCardTransactionsRepository,
    private readonly dataSource: DataSource,
  ) {}

  private generateCode(): string {
    const bytes = randomBytes(12);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Issues a new gift card with the given initial balance.
   */
  async issue(_tenantId: string, dto: IssueGiftCardDto, auditContext: AuditContext) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const code = this.generateCode();
      const initialBalance = dto.initialBalance;

      const giftCard = await this.giftCardsRepository.create({
        code,
        initialBalance,
        currentBalance: initialBalance,
        issuedTo: null,
        issuedBy: auditContext.userId ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: GiftCardStatus.ACTIVE,
      });

      await this.giftCardTransactionsRepository.create({
        giftCardId: giftCard.id,
        orderId: dto.issuedOrderId ?? null,
        amount: initialBalance,
        balanceAfter: initialBalance,
        transactionType: GC_TXN_ISSUE,
      });

      await queryRunner.commitTransaction();
      return giftCard;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Returns balance and status for a gift card by code.
   */
  async checkBalance(code: string, _tenantId: string) {
    const card = await this.giftCardsRepository.findByCode(code);
    if (!card) {
      throw new NotFoundException(msg(ErrorMessages.GIFT_CARD_NOT_FOUND, code));
    }

    return {
      currentBalance: Number(card.currentBalance),
      expiresAt: card.expiresAt,
      status: card.status,
    };
  }

  /**
   * Redeems a gift card for an order.
   * Partial balance is allowed — returns remainingToPay for second payment method.
   * Per business rules (Odoo): if balance insufficient, deduct available balance
   * and request second payment for the remainder.
   */
  async redeemGiftCard(
    _tenantId: string,
    code: string,
    amount: number,
    orderId: string | null,
    auditContext: AuditContext,
  ): Promise<GiftCardRedeemResult> {
    const card = await this.giftCardsRepository.findByCode(code);
    if (!card) {
      throw new NotFoundException(msg(ErrorMessages.GIFT_CARD_NOT_FOUND, code));
    }

    if (card.status !== GiftCardStatus.ACTIVE) {
      throw new BadRequestException(msg(ErrorMessages.GIFT_CARD_INACTIVE));
    }

    if (card.expiresAt) {
      const today = new Date().toISOString().split('T')[0];
      if (today > card.expiresAt.toString().substring(0, 10)) {
        throw new BadRequestException(msg(ErrorMessages.GIFT_CARD_EXPIRED));
      }
    }

    const currentBalance = Number(card.currentBalance);
    if (currentBalance <= 0) {
      return { amountDeducted: 0, remainingToPay: amount };
    }

    // Deduct up to available balance
    const amountToDeduct = Math.min(amount, currentBalance);
    const balanceAfter = Math.round((currentBalance - amountToDeduct) * 10000) / 10000;

    // Atomic update using raw query
    await this.dataSource.query(
      `UPDATE gift_cards
       SET current_balance = $1,
           status = CASE WHEN $1 = 0 THEN $2::gift_card_status ELSE status END,
           updated_at = NOW(),
           version = version + 1
       WHERE id = $3 AND deleted_at IS NULL`,
      [balanceAfter, GiftCardStatus.DEPLETED, card.id],
    );

    await this.giftCardTransactionsRepository.create({
      giftCardId: card.id,
      orderId: orderId ?? null,
      amount: -amountToDeduct,
      balanceAfter,
      transactionType: GC_TXN_REDEEM,
    });

    return {
      amountDeducted: Math.round(amountToDeduct * 100) / 100,
      remainingToPay: Math.round((amount - amountToDeduct) * 100) / 100,
    };
  }

  /**
   * Alias used by GiftCardsController for compatibility.
   */
  async redeem(
    tenantId: string,
    code: string,
    amount: number,
    orderId: string | null,
    auditContext: AuditContext,
    _containerTransaction: unknown,
  ): Promise<GiftCardRedeemResult> {
    return this.redeemGiftCard(tenantId, code, amount, orderId, auditContext);
  }

  /**
   * Refunds an amount back to a gift card (e.g. on order cancellation).
   */
  async refundToGiftCard(giftCardId: string, amount: number): Promise<void> {
    const card = await this.giftCardsRepository.refund(giftCardId, amount);

    await this.giftCardTransactionsRepository.create({
      giftCardId,
      orderId: null,
      amount,
      balanceAfter: Number(card.currentBalance),
      transactionType: GC_TXN_REFUND,
    });
  }

  /**
   * createTransaction() kept for backward compat with GiftCardsController.
   * Returns a no-op object since transactions are now managed internally.
   */
  async createTransaction(): Promise<{
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
  }> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
