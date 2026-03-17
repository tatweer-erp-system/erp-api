import { Injectable, Logger } from '@nestjs/common';
import { TaxUtil, TaxBreakdown, MultiTaxBreakdown } from '@/common/utils/financial/tax.util';
import { TaxesRepository } from '@/database/sql/repositories/taxes.repository';
import { ProductTaxesRepository } from '@/database/sql/repositories/product-taxes.repository';
import { FiscalPositionTaxesRepository } from '@/database/sql/repositories/fiscal-position-taxes.repository';
import { TaxType, TaxScope } from '@/common/enums/accounting-new.enums';

/** Result of a tax calculation with breakdown per tax rule */
export interface TaxCalculationResult {
  /** Net amount (before tax) */
  subtotal: number;
  /** Total tax amount */
  totalTax: number;
  /** Gross amount (after tax) */
  total: number;
  /** Breakdown per tax rule applied */
  breakdown: Array<{
    taxId: string;
    nameEn: string;
    nameAr: string;
    type: TaxType;
    rate: number;
    amount: number;
    saleAccountId: string | null;
    purchaseAccountId: string | null;
  }>;
}

@Injectable()
export class TaxSharedService {
  private readonly logger = new Logger(TaxSharedService.name);

  constructor(
    private readonly taxesRepository: TaxesRepository,
    private readonly productTaxesRepository: ProductTaxesRepository,
    private readonly fiscalPositionTaxesRepository: FiscalPositionTaxesRepository,
  ) {}

  // ── Simple helpers (backward-compatible) ────────────────────────────────

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

  // ── New tax calculation with taxes table ────────────────────────────────

  /**
   * Calculate taxes for a product using the taxes table.
   *
   * 1. Looks up product_taxes for the product
   * 2. If fiscalPositionId is provided, remaps taxes via fiscal position mappings
   * 3. Calculates tax per tax rule (percentage or fixed)
   * 4. Falls back to default 15% VAT if no specific taxes configured
   *
   * @param tenantId - Tenant ID
   * @param amount - Taxable amount (after discount)
   * @param productId - Product ID to look up taxes for (optional)
   * @param fiscalPositionId - Fiscal position ID for tax remapping (optional)
   * @param scope - Tax scope: sale or purchase (defaults to sale)
   */
  async calculateProductTax(
    tenantId: string,
    amount: number,
    productId?: string,
    fiscalPositionId?: string,
    scope: 'sale' | 'purchase' = 'sale',
  ): Promise<TaxCalculationResult> {
    let taxIds: string[] = [];

    // Step 1: Get product taxes if product ID is provided
    if (productId) {
      const productTaxes = await this.productTaxesRepository.findByProductId(tenantId, productId);
      const scopeFilter =
        scope === 'sale' ? [TaxScope.SALE, TaxScope.BOTH] : [TaxScope.PURCHASE, TaxScope.BOTH];
      taxIds = productTaxes
        .filter((pt: any) => scopeFilter.includes(pt.scope as TaxScope) || pt.scope === 'both')
        .map((pt: any) => pt.taxId as string);
    }

    // Step 2: Apply fiscal position remapping if applicable
    if (fiscalPositionId && taxIds.length > 0) {
      taxIds = await this.remapTaxesByFiscalPosition(tenantId, fiscalPositionId, taxIds);
    }

    // Step 3: Look up the actual tax records
    let taxRecords: Array<Record<string, unknown>> = [];
    if (taxIds.length > 0) {
      const allTaxes = await Promise.all(
        taxIds.map((taxId) => this.taxesRepository.findByIdOrNull(taxId, { tenantId })),
      );
      taxRecords = allTaxes
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => t as unknown as Record<string, unknown>)
        .filter((t) => t.isActive === true);
    }

    // Step 4: Default to 15% VAT if no specific taxes configured
    if (taxRecords.length === 0) {
      const defaultRate = this.getDefaultVatRate();
      const taxAmount = Math.round(amount * defaultRate) / 100;
      return {
        subtotal: amount,
        totalTax: Math.round(taxAmount * 100) / 100,
        total: Math.round((amount + taxAmount) * 100) / 100,
        breakdown: [
          {
            taxId: 'default-vat',
            nameEn: 'VAT 15%',
            nameAr: 'ضريبة القيمة المضافة 15%',
            type: TaxType.PERCENTAGE,
            rate: defaultRate,
            amount: Math.round(taxAmount * 100) / 100,
            saleAccountId: null,
            purchaseAccountId: null,
          },
        ],
      };
    }

    // Step 5: Calculate tax per rule
    let totalTax = 0;
    const breakdown: TaxCalculationResult['breakdown'] = [];

    for (const tax of taxRecords) {
      const taxType = tax.type as TaxType;
      const taxAmount = tax.amount as number;
      let calculatedTax: number;

      if (taxType === TaxType.PERCENTAGE) {
        calculatedTax = Math.round(amount * taxAmount) / 100;
      } else {
        // Fixed amount tax
        calculatedTax = taxAmount;
      }

      calculatedTax = Math.round(calculatedTax * 100) / 100;
      totalTax += calculatedTax;

      breakdown.push({
        taxId: tax.id as string,
        nameEn: tax.nameEn as string,
        nameAr: tax.nameAr as string,
        type: taxType,
        rate: taxAmount,
        amount: calculatedTax,
        saleAccountId: (tax.saleAccountId as string) ?? null,
        purchaseAccountId: (tax.purchaseAccountId as string) ?? null,
      });
    }

    totalTax = Math.round(totalTax * 100) / 100;

    return {
      subtotal: amount,
      totalTax,
      total: Math.round((amount + totalTax) * 100) / 100,
      breakdown,
    };
  }

  /**
   * Remap tax IDs based on a fiscal position's tax mappings.
   * For each tax in taxIds, checks if the fiscal position has a mapping.
   * If mapped, replaces with taxDestId (or removes if taxDestId is null).
   * If not mapped, keeps the original tax.
   */
  private async remapTaxesByFiscalPosition(
    tenantId: string,
    fiscalPositionId: string,
    taxIds: string[],
  ): Promise<string[]> {
    const taxMappings = await this.fiscalPositionTaxesRepository.findAllRaw({
      tenantId,
      where: { fiscalPositionId },
    });

    // Build lookup: taxSrcId -> taxDestId (null means remove)
    const mappingLookup = new Map<string, string | null>();
    for (const mapping of taxMappings) {
      const m = mapping as unknown as Record<string, unknown>;
      mappingLookup.set(m.taxSrcId as string, (m.taxDestId as string) ?? null);
    }

    const resolvedTaxIds: string[] = [];
    for (const taxId of taxIds) {
      if (mappingLookup.has(taxId)) {
        const destId = mappingLookup.get(taxId) ?? null;
        if (destId !== null) {
          resolvedTaxIds.push(destId);
        }
        // If destId is null, the tax is removed
      } else {
        resolvedTaxIds.push(taxId);
      }
    }

    return resolvedTaxIds;
  }
}
