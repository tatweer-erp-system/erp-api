import { Injectable } from '@nestjs/common';
import { TaxUtil, TaxBreakdown, MultiTaxBreakdown } from '@/common/utils/financial/tax.util';

@Injectable()
export class TaxSharedService {
  calculateTax(amount: number, taxRate: number): TaxBreakdown {
    return TaxUtil.calculateTax(amount, taxRate);
  }

  calculateTaxInclusive(amountWithTax: number, taxRate: number): TaxBreakdown {
    return TaxUtil.calculateTaxInclusive(amountWithTax, taxRate);
  }

  applyMultipleTaxes(amount: number, taxes: { name: string; rate: number }[]): MultiTaxBreakdown {
    return TaxUtil.applyMultipleTaxes(amount, taxes);
  }

  buildTaxBreakdown(
    unitPrice: number,
    quantity: number,
    discountAmount: number,
    taxRate: number,
  ): TaxBreakdown {
    return TaxUtil.buildTaxBreakdown(unitPrice, quantity, discountAmount, taxRate);
  }

  getDefaultVatRate(): number {
    return 15;
  }
}
