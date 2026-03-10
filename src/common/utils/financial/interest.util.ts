import Decimal from 'decimal.js';
import { DecimalUtil } from '../math/decimal.util';

export class InterestUtil {
  /**
   * Calculate late payment interest (simple interest)
   * interest = principal * rate/100 * days/365
   */
  static calculateLatePaymentInterest(
    principal: number | string | Decimal,
    annualRate: number | string | Decimal,
    daysOverdue: number,
  ): Decimal {
    if (daysOverdue <= 0) return DecimalUtil.toDecimal(0);

    const dailyRate = DecimalUtil.divide(annualRate, 365);
    const interest = DecimalUtil.multiply(
      DecimalUtil.percentage(principal, dailyRate),
      daysOverdue,
    );
    return DecimalUtil.roundHalfUp(interest);
  }

  /**
   * Calculate compound interest
   * A = P * (1 + r/n)^(n*t)
   * interest = A - P
   */
  static calculateCompoundInterest(
    principal: number | string | Decimal,
    annualRate: number | string | Decimal,
    compoundsPerYear: number,
    years: number,
  ): Decimal {
    const p = DecimalUtil.toDecimal(principal);
    const r = DecimalUtil.divide(annualRate, 100);
    const ratePerPeriod = DecimalUtil.divide(r, compoundsPerYear);
    const onePlusRate = DecimalUtil.add(1, ratePerPeriod);
    const periods = compoundsPerYear * years;
    const amount = onePlusRate.pow(periods).times(p);
    const interest = DecimalUtil.subtract(amount, p);
    return DecimalUtil.roundHalfUp(interest);
  }
}
