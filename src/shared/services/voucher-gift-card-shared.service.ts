import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { VouchersRepository } from '@/database/sql/repositories/vouchers.repository';
import { VoucherRedemptionsRepository } from '@/database/sql/repositories/voucher-redemptions.repository';
import { GiftCardsRepository } from '@/database/sql/repositories/gift-cards.repository';
import { GiftCardTransactionsRepository } from '@/database/sql/repositories/gift-card-transactions.repository';
import { DiscountType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

export interface VoucherValidationResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;
  voucherId?: string;
}

export interface GiftCardRedeemResult {
  amountDeducted: number;
  remainingToPay: number;
}

@Injectable()
export class VoucherGiftCardSharedService {
  constructor(
    private readonly vouchersRepository: VouchersRepository,
    private readonly voucherRedemptionsRepository: VoucherRedemptionsRepository,
    private readonly giftCardsRepository: GiftCardsRepository,
    private readonly giftCardTransactionsRepository: GiftCardTransactionsRepository,
  ) {}

  /**
   * Validate a voucher code against an order.
   *
   * @param customerId The customer/partner ID. Callers migrating from contactId
   *   should pass partnerId here — vouchers use customerId as the ownership key.
   */
  async validateVoucher(
    tenantId: string,
    code: string,
    orderTotal: number,
    customerId?: string,
  ): Promise<VoucherValidationResult> {
    const voucher = await this.vouchersRepository.findOne({
      tenantId,
      where: { code },
    });
    if (!voucher) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_FOUND, code) };
    }

    if (!voucher.isActive) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_INACTIVE, code) };
    }

    const today = new Date().toISOString().split('T')[0];
    if (voucher.validFrom && today < voucher.validFrom) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_VALID_FOR_TIME, code) };
    }
    if (voucher.validUntil && today > voucher.validUntil) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_EXPIRED, code) };
    }

    if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_MAX_USES, code) };
    }

    if (voucher.customerId && customerId !== voucher.customerId) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_FOR_CUSTOMER, code) };
    }

    if (customerId && voucher.maxUsesPerCustomer) {
      const customerRedemptions = await this.voucherRedemptionsRepository.count({
        where: { voucherId: voucher.id, customerId },
      });
      if (customerRedemptions >= voucher.maxUsesPerCustomer) {
        return { valid: false, error: msg(ErrorMessages.VOUCHER_CUSTOMER_MAX_USES, code) };
      }
    }

    const minOrderAmount = parseFloat(String(voucher.minOrderAmount)) || 0;
    if (orderTotal < minOrderAmount) {
      return {
        valid: false,
        error: msg(ErrorMessages.VOUCHER_MIN_ORDER, code, minOrderAmount, orderTotal),
      };
    }

    const discountValue = parseFloat(String(voucher.discountValue));
    const maxDiscountAmount = voucher.maxDiscountAmount
      ? parseFloat(String(voucher.maxDiscountAmount))
      : null;
    let actual: number;

    if (voucher.discountType === DiscountType.PERCENT) {
      const raw = (orderTotal * discountValue) / 100;
      actual = maxDiscountAmount !== null ? Math.min(raw, maxDiscountAmount) : raw;
    } else {
      actual = Math.min(discountValue, orderTotal);
    }

    return {
      valid: true,
      discountAmount: Math.round(actual * 100) / 100,
      voucherId: voucher.id,
    };
  }

  /**
   * Record voucher redemption.
   */
  async redeemVoucher(
    voucherId: string,
    orderId: string,
    customerId: string | null,
    discountApplied: number,
    transaction: Transaction,
  ): Promise<void> {
    await this.voucherRedemptionsRepository.create(
      {
        voucherId,
        orderId,
        customerId,
        discountApplied,
        redeemedAt: new Date(),
      } as any,
      { transaction },
    );

    await this.vouchersRepository.rawQuery(
      `UPDATE vouchers SET "usedCount" = "usedCount" + 1, version = version + 1 WHERE id = :voucherId`,
      { voucherId },
      transaction,
    );
  }

  /**
   * Redeem a gift card for payment.
   */
  async redeemGiftCard(
    tenantId: string,
    code: string,
    amount: number,
    orderId: string,
    transaction: Transaction,
  ): Promise<GiftCardRedeemResult> {
    const card = await this.giftCardsRepository.findOne({
      tenantId,
      where: { code },
      transaction,
    });
    if (!card) {
      return { amountDeducted: 0, remainingToPay: amount };
    }

    const currentBalance = parseFloat(String(card.currentBalance ?? 0));
    const amountToDeduct = Math.min(amount, currentBalance);
    const remainingToPay = Math.round((amount - amountToDeduct) * 100) / 100;

    if (amountToDeduct <= 0) {
      return { amountDeducted: 0, remainingToPay: amount };
    }

    const fullDeductResult = await this.giftCardsRepository.rawQuery<{ id: string }[]>(
      `UPDATE gift_cards
       SET "currentBalance" = "currentBalance" - :amount,
           version = version + 1
       WHERE id = :cardId
         AND "currentBalance" >= :amount
         AND "deletedAt" IS NULL
       RETURNING id`,
      { amount: amountToDeduct, cardId: card.id },
      transaction,
    );

    let actualDeducted = amountToDeduct;
    let balanceAfter = currentBalance - amountToDeduct;

    if (!fullDeductResult || fullDeductResult.length === 0) {
      await this.giftCardsRepository.rawQuery<{ currentBalance: string }[]>(
        `UPDATE gift_cards
         SET "currentBalance" = 0,
             version = version + 1
         WHERE id = :cardId
           AND "currentBalance" > 0
           AND "deletedAt" IS NULL
         RETURNING "currentBalance"`,
        { cardId: card.id },
        transaction,
      );
      actualDeducted = currentBalance;
      balanceAfter = 0;
    }

    await this.giftCardTransactionsRepository.create(
      {
        giftCardId: card.id,
        type: 'redeem',
        amount: -actualDeducted,
        balanceAfter,
        orderId,
      } as any,
      { transaction },
    );

    return {
      amountDeducted: actualDeducted,
      remainingToPay: Math.round((amount - actualDeducted) * 100) / 100,
    };
  }
}
