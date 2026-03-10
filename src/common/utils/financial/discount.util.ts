import Decimal from 'decimal.js';
import { DecimalUtil } from '../math/decimal.util';

export interface DiscountResult {
  originalAmount: Decimal;
  discountAmount: Decimal;
  finalAmount: Decimal;
}

export class DiscountUtil {
  /** Apply a percentage discount */
  static applyPercentageDiscount(
    amount: number | string | Decimal,
    percentage: number | string | Decimal,
  ): DiscountResult {
    const original = DecimalUtil.toDecimal(amount);
    const discountAmount = DecimalUtil.roundHalfUp(DecimalUtil.percentage(original, percentage));
    const finalAmount = DecimalUtil.roundHalfUp(DecimalUtil.subtract(original, discountAmount));

    return { originalAmount: original, discountAmount, finalAmount };
  }

  /** Apply a fixed discount */
  static applyFixedDiscount(
    amount: number | string | Decimal,
    discount: number | string | Decimal,
  ): DiscountResult {
    const original = DecimalUtil.toDecimal(amount);
    const discountVal = DecimalUtil.toDecimal(discount);
    const capped = Decimal.min(discountVal, original);
    const finalAmount = DecimalUtil.roundHalfUp(DecimalUtil.subtract(original, capped));

    return { originalAmount: original, discountAmount: capped, finalAmount };
  }

  /** Apply multiple discounts sequentially (compound) */
  static applyDiscounts(
    amount: number | string | Decimal,
    discounts: { type: 'percentage' | 'fixed'; value: number | string | Decimal }[],
  ): DiscountResult {
    let current = DecimalUtil.toDecimal(amount);
    let totalDiscount = DecimalUtil.toDecimal(0);

    for (const discount of discounts) {
      const result =
        discount.type === 'percentage'
          ? DiscountUtil.applyPercentageDiscount(current, discount.value)
          : DiscountUtil.applyFixedDiscount(current, discount.value);

      totalDiscount = DecimalUtil.add(totalDiscount, result.discountAmount);
      current = result.finalAmount;
    }

    return {
      originalAmount: DecimalUtil.toDecimal(amount),
      discountAmount: DecimalUtil.roundHalfUp(totalDiscount),
      finalAmount: DecimalUtil.roundHalfUp(current),
    };
  }

  /** Validate discount does not exceed amount */
  static validateDiscount(
    amount: number | string | Decimal,
    discount: number | string | Decimal,
    type: 'percentage' | 'fixed',
  ): boolean {
    if (type === 'percentage') {
      const rate = DecimalUtil.toDecimal(discount);
      return rate.gte(0) && rate.lte(100);
    }
    return (
      DecimalUtil.toDecimal(discount).gte(0) &&
      DecimalUtil.toDecimal(discount).lte(DecimalUtil.toDecimal(amount))
    );
  }
}
