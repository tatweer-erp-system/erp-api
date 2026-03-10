import Decimal from 'decimal.js';
import { DecimalUtil } from '../math/decimal.util';

export interface ConversionResult {
  originalAmount: Decimal;
  convertedAmount: Decimal;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: Decimal;
}

export class CurrencyUtil {
  /** Convert an amount from one currency to another using exchange rate */
  static convertAmount(
    amount: number | string | Decimal,
    exchangeRate: number | string | Decimal,
    fromCurrency: string,
    toCurrency: string,
  ): ConversionResult {
    const original = DecimalUtil.toDecimal(amount);
    const rate = DecimalUtil.toDecimal(exchangeRate);
    const converted = DecimalUtil.roundHalfUp(DecimalUtil.multiply(original, rate));

    return {
      originalAmount: original,
      convertedAmount: converted,
      fromCurrency,
      toCurrency,
      exchangeRate: rate,
    };
  }

  /** Get exchange rate between two currencies via a base rate */
  static getExchangeRate(
    fromRate: number | string | Decimal,
    toRate: number | string | Decimal,
  ): Decimal {
    return DecimalUtil.roundHalfUp(DecimalUtil.divide(toRate, fromRate), 6);
  }

  /**
   * Format amount with currency code
   * e.g. formatAmount(1234.56, 'SAR') => 'SAR 1,234.56'
   */
  static formatAmount(
    amount: number | string | Decimal,
    currencyCode: string,
    locale: 'en' | 'ar' = 'en',
  ): string {
    const num = DecimalUtil.toNumber(DecimalUtil.roundHalfUp(amount));
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

    return `${currencyCode} ${formatted}`;
  }
}
