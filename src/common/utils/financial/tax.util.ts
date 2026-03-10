import Decimal from 'decimal.js';
import { DecimalUtil } from '../math/decimal.util';

export interface TaxBreakdown {
  subtotal: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  total: Decimal;
}

export interface MultiTaxBreakdown {
  subtotal: Decimal;
  taxes: { name: string; rate: Decimal; amount: Decimal }[];
  totalTax: Decimal;
  total: Decimal;
}

export class TaxUtil {
  /** Calculate tax on a tax-exclusive amount */
  static calculateTax(
    amount: number | string | Decimal,
    taxRate: number | string | Decimal,
  ): TaxBreakdown {
    const subtotal = DecimalUtil.toDecimal(amount);
    const rate = DecimalUtil.toDecimal(taxRate);
    const taxAmount = DecimalUtil.roundHalfUp(DecimalUtil.percentage(subtotal, rate));
    const total = DecimalUtil.roundHalfUp(DecimalUtil.add(subtotal, taxAmount));

    return { subtotal, taxRate: rate, taxAmount, total };
  }

  /** Extract tax from a tax-inclusive amount */
  static calculateTaxInclusive(
    totalAmount: number | string | Decimal,
    taxRate: number | string | Decimal,
  ): TaxBreakdown {
    const total = DecimalUtil.toDecimal(totalAmount);
    const rate = DecimalUtil.toDecimal(taxRate);
    const divisor = DecimalUtil.add(100, rate);
    const subtotal = DecimalUtil.roundHalfUp(
      DecimalUtil.divide(DecimalUtil.multiply(total, 100), divisor),
    );
    const taxAmount = DecimalUtil.roundHalfUp(DecimalUtil.subtract(total, subtotal));

    return { subtotal, taxRate: rate, taxAmount, total };
  }

  /** Apply multiple tax rates to an amount */
  static applyMultipleTaxes(
    amount: number | string | Decimal,
    taxes: { name: string; rate: number | string | Decimal }[],
  ): MultiTaxBreakdown {
    const subtotal = DecimalUtil.toDecimal(amount);
    const taxEntries = taxes.map((tax) => {
      const rate = DecimalUtil.toDecimal(tax.rate);
      const taxAmount = DecimalUtil.roundHalfUp(DecimalUtil.percentage(subtotal, rate));
      return { name: tax.name, rate, amount: taxAmount };
    });

    const totalTax = DecimalUtil.sum(taxEntries.map((t) => t.amount));
    const total = DecimalUtil.roundHalfUp(DecimalUtil.add(subtotal, totalTax));

    return { subtotal, taxes: taxEntries, totalTax, total };
  }

  /** Build ZATCA-compliant tax breakdown per line (tax after discount) */
  static buildTaxBreakdown(
    unitPrice: number | string | Decimal,
    quantity: number | string | Decimal,
    discountAmount: number | string | Decimal,
    taxRate: number | string | Decimal,
  ): TaxBreakdown {
    const lineTotal = DecimalUtil.multiply(unitPrice, quantity);
    const subtotal = DecimalUtil.roundHalfUp(DecimalUtil.subtract(lineTotal, discountAmount));
    const taxAmount = DecimalUtil.roundHalfUp(DecimalUtil.percentage(subtotal, taxRate));
    const total = DecimalUtil.roundHalfUp(DecimalUtil.add(subtotal, taxAmount));

    return { subtotal, taxRate: DecimalUtil.toDecimal(taxRate), taxAmount, total };
  }
}
