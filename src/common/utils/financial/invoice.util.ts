import Decimal from 'decimal.js';
import { DecimalUtil } from '../math/decimal.util';
import { TaxUtil, TaxBreakdown } from './tax.util';

export interface InvoiceLine {
  unitPrice: number | string | Decimal;
  quantity: number | string | Decimal;
  discountAmount?: number | string | Decimal;
  taxRate: number | string | Decimal;
}

export interface InvoiceLineTotals extends TaxBreakdown {
  lineTotal: Decimal;
  discountAmount: Decimal;
}

export interface InvoiceTotals {
  lines: InvoiceLineTotals[];
  subtotalBeforeDiscount: Decimal;
  totalDiscount: Decimal;
  subtotalAfterDiscount: Decimal;
  totalTax: Decimal;
  grandTotal: Decimal;
}

export interface ZATCAInvoiceLine {
  lineTotal: Decimal;
  discountAmount: Decimal;
  taxableAmount: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  totalWithTax: Decimal;
}

export class InvoiceUtil {
  /** Calculate totals for an entire invoice (ZATCA-compliant: tax after discount per line) */
  static calculateInvoiceTotals(lines: InvoiceLine[]): InvoiceTotals {
    const lineResults: InvoiceLineTotals[] = lines.map((line) => {
      const lineTotal = DecimalUtil.roundHalfUp(
        DecimalUtil.multiply(line.unitPrice, line.quantity),
      );
      const discount = DecimalUtil.toDecimal(line.discountAmount ?? 0);
      const breakdown = TaxUtil.buildTaxBreakdown(
        line.unitPrice,
        line.quantity,
        discount,
        line.taxRate,
      );

      return {
        lineTotal,
        discountAmount: discount,
        ...breakdown,
      };
    });

    const subtotalBeforeDiscount = DecimalUtil.sum(lineResults.map((l) => l.lineTotal));
    const totalDiscount = DecimalUtil.sum(lineResults.map((l) => l.discountAmount));
    const subtotalAfterDiscount = DecimalUtil.sum(lineResults.map((l) => l.subtotal));
    const totalTax = DecimalUtil.sum(lineResults.map((l) => l.taxAmount));
    const grandTotal = DecimalUtil.sum(lineResults.map((l) => l.total));

    return {
      lines: lineResults,
      subtotalBeforeDiscount: DecimalUtil.roundHalfUp(subtotalBeforeDiscount),
      totalDiscount: DecimalUtil.roundHalfUp(totalDiscount),
      subtotalAfterDiscount: DecimalUtil.roundHalfUp(subtotalAfterDiscount),
      totalTax: DecimalUtil.roundHalfUp(totalTax),
      grandTotal: DecimalUtil.roundHalfUp(grandTotal),
    };
  }

  /** Build a ZATCA-compliant invoice line */
  static buildZATCAInvoiceLine(
    unitPrice: number | string | Decimal,
    quantity: number | string | Decimal,
    discountAmount: number | string | Decimal,
    taxRate: number | string | Decimal,
  ): ZATCAInvoiceLine {
    const lineTotal = DecimalUtil.roundHalfUp(DecimalUtil.multiply(unitPrice, quantity));
    const discount = DecimalUtil.toDecimal(discountAmount);
    const taxableAmount = DecimalUtil.roundHalfUp(DecimalUtil.subtract(lineTotal, discount));
    const taxAmount = DecimalUtil.roundHalfUp(DecimalUtil.percentage(taxableAmount, taxRate));
    const totalWithTax = DecimalUtil.roundHalfUp(DecimalUtil.add(taxableAmount, taxAmount));

    return {
      lineTotal,
      discountAmount: discount,
      taxableAmount,
      taxRate: DecimalUtil.toDecimal(taxRate),
      taxAmount,
      totalWithTax,
    };
  }

  /** Validate ZATCA invoice requirements */
  static validateZATCAInvoice(invoice: {
    zatcaUUID?: string;
    zatcaInvoiceCounter?: number;
    invoiceType?: string;
    lines?: InvoiceLine[];
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!invoice.zatcaUUID) errors.push('ZATCA UUID is required');
    if (!invoice.zatcaInvoiceCounter) errors.push('ZATCA invoice counter is required');
    if (!invoice.invoiceType || !['standard', 'simplified'].includes(invoice.invoiceType)) {
      errors.push('Invoice type must be standard or simplified');
    }
    if (!invoice.lines || invoice.lines.length === 0) {
      errors.push('Invoice must have at least one line');
    }

    return { valid: errors.length === 0, errors };
  }
}
