import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Voucher } from '@/database/sql/entities/voucher.entity';
import { VoucherRedemption } from '@/database/sql/entities/voucher-redemption.entity';
import { GiftCard } from '@/database/sql/entities/gift-card.entity';
import { GiftCardTransaction } from '@/database/sql/entities/gift-card-transaction.entity';
import { VoucherStatus, VoucherType, GiftCardStatus } from '@/common/enums/loyalty.enums';

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

/**
 * VoucherGiftCardSharedService — used by POS and other modules that cannot import
 * VouchersGiftCardsModule directly (anti-circular-dependency rule).
 */
@Injectable()
export class VoucherGiftCardSharedService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherRedemption)
    private readonly redemptionRepo: Repository<VoucherRedemption>,
    @InjectRepository(GiftCard)
    private readonly giftCardRepo: Repository<GiftCard>,
    @InjectRepository(GiftCardTransaction)
    private readonly gcTxnRepo: Repository<GiftCardTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async validateVoucher(
    _tenantId: string,
    code: string,
    orderTotal: number,
    customerId?: string,
  ): Promise<VoucherValidationResult> {
    const voucher = await this.voucherRepo.findOne({ where: { code } as any });
    if (!voucher) {
      return { valid: false, error: `Voucher '${code}' not found` };
    }

    if (voucher.status !== VoucherStatus.ACTIVE) {
      return { valid: false, error: `Voucher '${code}' is not active` };
    }

    const today = new Date().toISOString().split('T')[0];
    if (voucher.validFrom && today < voucher.validFrom.toString().substring(0, 10)) {
      return { valid: false, error: `Voucher '${code}' is not yet valid` };
    }
    if (voucher.validUntil && today > voucher.validUntil.toString().substring(0, 10)) {
      return { valid: false, error: `Voucher '${code}' has expired` };
    }

    if (voucher.usageLimit !== null && voucher.usageCount >= voucher.usageLimit) {
      return { valid: false, error: `Voucher '${code}' has reached its usage limit` };
    }

    if (voucher.customerId && customerId !== voucher.customerId) {
      return { valid: false, error: `Voucher '${code}' is not valid for this customer` };
    }

    const minOrderAmount = Number(voucher.minOrderAmount) || 0;
    if (orderTotal < minOrderAmount) {
      return {
        valid: false,
        error: `Order total ${orderTotal} is below minimum required ${minOrderAmount}`,
      };
    }

    const value = Number(voucher.value) || 0;
    let discountAmount: number;
    if (voucher.voucherType === VoucherType.PERCENTAGE) {
      discountAmount = (orderTotal * value) / 100;
    } else {
      discountAmount = Math.min(value, orderTotal);
    }

    return {
      valid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      voucherId: voucher.id,
    };
  }

  async redeemVoucher(
    voucherId: string,
    orderId: string,
    customerId: string | null,
    discountApplied: number,
    _transaction?: unknown,
  ): Promise<void> {
    const redemption = this.redemptionRepo.create({
      voucherId,
      orderId,
      customerId,
      discountApplied,
    } as any);
    await this.redemptionRepo.save(redemption);

    await this.voucherRepo
      .createQueryBuilder()
      .update(Voucher)
      .set({ usageCount: () => 'usage_count + 1' })
      .where('id = :id', { id: voucherId })
      .execute();
  }

  /**
   * Deducts amount from a gift card. Partial balance supported.
   * If balance < amount, deducts all available and returns remaining.
   */
  async redeemGiftCard(
    _tenantId: string,
    code: string,
    amount: number,
    orderId: string,
    _transaction?: unknown,
  ): Promise<GiftCardRedeemResult> {
    const card = await this.giftCardRepo.findOne({ where: { code } as any });
    if (!card) {
      throw new NotFoundException(`Gift card '${code}' not found`);
    }

    if (card.status !== GiftCardStatus.ACTIVE) {
      throw new BadRequestException(`Gift card '${code}' is not active`);
    }

    if (card.expiresAt) {
      const today = new Date().toISOString().split('T')[0];
      if (today > card.expiresAt.toString().substring(0, 10)) {
        throw new BadRequestException(`Gift card '${code}' has expired`);
      }
    }

    const currentBalance = Number(card.currentBalance);
    if (currentBalance <= 0) return { amountDeducted: 0, remainingToPay: amount };

    const amountToDeduct = Math.min(amount, currentBalance);
    const balanceAfter = Math.round((currentBalance - amountToDeduct) * 10000) / 10000;

    await this.dataSource.query(
      `UPDATE gift_cards
       SET current_balance = $1,
           status = CASE WHEN $1 = 0 THEN $2::gift_card_status ELSE status END,
           updated_at = NOW(),
           version = version + 1
       WHERE id = $3 AND deleted_at IS NULL`,
      [balanceAfter, GiftCardStatus.DEPLETED, card.id],
    );

    const gcTxn = this.gcTxnRepo.create({
      giftCardId: card.id,
      orderId,
      amount: -amountToDeduct,
      balanceAfter,
      transactionType: 'redeem',
    } as any);
    await this.gcTxnRepo.save(gcTxn);

    return {
      amountDeducted: Math.round(amountToDeduct * 100) / 100,
      remainingToPay: Math.round((amount - amountToDeduct) * 100) / 100,
    };
  }
}
