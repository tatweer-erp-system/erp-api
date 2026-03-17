jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { TaxSharedService } from './tax-shared.service';
import { TaxType, TaxScope } from '@/common/enums/accounting-new.enums';

describe('TaxSharedService', () => {
  let service: TaxSharedService;
  let taxesRepository: Record<string, jest.Mock>;
  let productTaxesRepository: Record<string, jest.Mock>;
  let fiscalPositionTaxesRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';

  beforeEach(() => {
    taxesRepository = {
      findByIdOrNull: jest.fn().mockResolvedValue(null),
    };

    productTaxesRepository = {
      findByProductId: jest.fn().mockResolvedValue([]),
    };

    fiscalPositionTaxesRepository = {
      findAllRaw: jest.fn().mockResolvedValue([]),
    };

    service = new TaxSharedService(
      taxesRepository as any,
      productTaxesRepository as any,
      fiscalPositionTaxesRepository as any,
    );
  });

  // ── calculateTax (simple) ───────────────────────────────────────────────

  describe('calculateTax()', () => {
    it('should calculate 15% VAT on 1000 SAR', () => {
      const result = service.calculateTax(1000, 15);
      expect(result.taxAmount.toNumber()).toBe(150);
      expect(result.total.toNumber()).toBe(1150);
    });

    it('should return 0 tax for 0% rate', () => {
      const result = service.calculateTax(1000, 0);
      expect(result.taxAmount.toNumber()).toBe(0);
      expect(result.total.toNumber()).toBe(1000);
    });

    it('should handle fractional amounts correctly', () => {
      const result = service.calculateTax(33.33, 15);
      expect(result.taxAmount.toNumber()).toBe(5);
      expect(result.total.toNumber()).toBe(38.33);
    });
  });

  // ── calculateTaxInclusive ──────────────────────────────────────────────

  describe('calculateTaxInclusive()', () => {
    it('should extract tax from inclusive amount', () => {
      const result = service.calculateTaxInclusive(1150, 15);
      expect(result.subtotal.toNumber()).toBe(1000);
      expect(result.taxAmount.toNumber()).toBe(150);
    });

    it('should handle 0% rate (no tax)', () => {
      const result = service.calculateTaxInclusive(1000, 0);
      expect(result.subtotal.toNumber()).toBe(1000);
      expect(result.taxAmount.toNumber()).toBe(0);
    });
  });

  // ── buildTaxBreakdown (tax after discount) ─────────────────────────────

  describe('buildTaxBreakdown()', () => {
    it('should calculate tax AFTER discount', () => {
      // unitPrice=100, qty=2, discount=50, rate=15%
      // subtotal = 200 - 50 = 150
      // tax = 150 * 15/100 = 22.5
      const result = service.buildTaxBreakdown(100, 2, 50, 15);
      expect(result.subtotal.toNumber()).toBe(150);
      expect(result.taxAmount.toNumber()).toBe(22.5);
      expect(result.total.toNumber()).toBe(172.5);
    });

    it('should apply 0 discount correctly', () => {
      const result = service.buildTaxBreakdown(100, 1, 0, 15);
      expect(result.subtotal.toNumber()).toBe(100);
      expect(result.taxAmount.toNumber()).toBe(15);
      expect(result.total.toNumber()).toBe(115);
    });

    it('should handle full discount (subtotal = 0)', () => {
      const result = service.buildTaxBreakdown(100, 1, 100, 15);
      expect(result.subtotal.toNumber()).toBe(0);
      expect(result.taxAmount.toNumber()).toBe(0);
      expect(result.total.toNumber()).toBe(0);
    });
  });

  // ── getDefaultVatRate ──────────────────────────────────────────────────

  describe('getDefaultVatRate()', () => {
    it('should return 15', () => {
      expect(service.getDefaultVatRate()).toBe(15);
    });
  });

  // ── calculateProductTax ─────────────────────────────────────────────────

  describe('calculateProductTax()', () => {
    it('should default to 15% VAT when no product taxes configured', async () => {
      const result = await service.calculateProductTax(tenantId, 1000);

      expect(result.subtotal).toBe(1000);
      expect(result.totalTax).toBe(150);
      expect(result.total).toBe(1150);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].taxId).toBe('default-vat');
      expect(result.breakdown[0].rate).toBe(15);
    });

    it('should default to 15% VAT when product has no taxes', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([]);

      const result = await service.calculateProductTax(tenantId, 500, 'product-001');

      expect(result.totalTax).toBe(75);
      expect(result.total).toBe(575);
    });

    it('should apply percentage tax from product_taxes', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-001', scope: TaxScope.SALE },
      ]);
      taxesRepository.findByIdOrNull.mockResolvedValue({
        id: 'tax-001',
        nameEn: 'VAT 15%',
        nameAr: 'ضريبة 15%',
        type: TaxType.PERCENTAGE,
        amount: 15,
        isActive: true,
        saleAccountId: 'vat-acc',
        purchaseAccountId: null,
      });

      const result = await service.calculateProductTax(tenantId, 1000, 'product-001');

      expect(result.totalTax).toBe(150);
      expect(result.breakdown[0].taxId).toBe('tax-001');
      expect(result.breakdown[0].type).toBe(TaxType.PERCENTAGE);
    });

    it('should apply fixed tax from product_taxes', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-002', scope: TaxScope.SALE },
      ]);
      taxesRepository.findByIdOrNull.mockResolvedValue({
        id: 'tax-002',
        nameEn: 'Stamp Duty',
        nameAr: 'رسم طابع',
        type: TaxType.FIXED,
        amount: 10,
        isActive: true,
        saleAccountId: null,
        purchaseAccountId: null,
      });

      const result = await service.calculateProductTax(tenantId, 1000, 'product-001');

      expect(result.totalTax).toBe(10);
      expect(result.total).toBe(1010);
      expect(result.breakdown[0].type).toBe(TaxType.FIXED);
    });

    it('should skip inactive taxes', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-001', scope: TaxScope.SALE },
      ]);
      taxesRepository.findByIdOrNull.mockResolvedValue({
        id: 'tax-001',
        nameEn: 'Old Tax',
        nameAr: 'ضريبة قديمة',
        type: TaxType.PERCENTAGE,
        amount: 10,
        isActive: false,
      });

      const result = await service.calculateProductTax(tenantId, 1000, 'product-001');

      // Falls back to default 15% because active taxes array is empty
      expect(result.totalTax).toBe(150);
    });

    it('should filter taxes by sale scope', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-sale', scope: TaxScope.SALE },
        { taxId: 'tax-purchase', scope: TaxScope.PURCHASE },
      ]);
      taxesRepository.findByIdOrNull.mockImplementation((_id: string) => {
        if (_id === 'tax-sale') {
          return Promise.resolve({
            id: 'tax-sale',
            nameEn: 'Sale Tax',
            nameAr: 'ضريبة بيع',
            type: TaxType.PERCENTAGE,
            amount: 10,
            isActive: true,
            saleAccountId: null,
            purchaseAccountId: null,
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.calculateProductTax(
        tenantId,
        1000,
        'product-001',
        undefined,
        'sale',
      );

      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].taxId).toBe('tax-sale');
    });

    it('should filter taxes by purchase scope', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-sale', scope: TaxScope.SALE },
        { taxId: 'tax-purchase', scope: TaxScope.PURCHASE },
      ]);
      taxesRepository.findByIdOrNull.mockImplementation((_id: string) => {
        if (_id === 'tax-purchase') {
          return Promise.resolve({
            id: 'tax-purchase',
            nameEn: 'Input VAT',
            nameAr: 'ضريبة مشتريات',
            type: TaxType.PERCENTAGE,
            amount: 15,
            isActive: true,
            saleAccountId: null,
            purchaseAccountId: 'purchase-vat-acc',
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.calculateProductTax(
        tenantId,
        1000,
        'product-001',
        undefined,
        'purchase',
      );

      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].taxId).toBe('tax-purchase');
    });

    it('should include BOTH scope taxes in sale context', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-both', scope: TaxScope.BOTH },
      ]);
      taxesRepository.findByIdOrNull.mockResolvedValue({
        id: 'tax-both',
        nameEn: 'Universal Tax',
        nameAr: 'ضريبة شاملة',
        type: TaxType.PERCENTAGE,
        amount: 5,
        isActive: true,
        saleAccountId: null,
        purchaseAccountId: null,
      });

      const result = await service.calculateProductTax(
        tenantId,
        1000,
        'product-001',
        undefined,
        'sale',
      );

      expect(result.totalTax).toBe(50);
    });

    it('should apply fiscal position tax remapping', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-src', scope: TaxScope.SALE },
      ]);
      fiscalPositionTaxesRepository.findAllRaw.mockResolvedValue([
        { taxSrcId: 'tax-src', taxDestId: 'tax-dest' },
      ]);
      taxesRepository.findByIdOrNull.mockResolvedValue({
        id: 'tax-dest',
        nameEn: 'Reduced VAT',
        nameAr: 'ضريبة مخفضة',
        type: TaxType.PERCENTAGE,
        amount: 5,
        isActive: true,
        saleAccountId: null,
        purchaseAccountId: null,
      });

      const result = await service.calculateProductTax(
        tenantId,
        1000,
        'product-001',
        'fiscal-pos-001',
        'sale',
      );

      expect(result.totalTax).toBe(50); // 5% instead of original
      expect(result.breakdown[0].taxId).toBe('tax-dest');
    });

    it('should remove tax when fiscal position maps to null', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-src', scope: TaxScope.SALE },
      ]);
      fiscalPositionTaxesRepository.findAllRaw.mockResolvedValue([
        { taxSrcId: 'tax-src', taxDestId: null },
      ]);

      const result = await service.calculateProductTax(
        tenantId,
        1000,
        'product-001',
        'fiscal-pos-001',
        'sale',
      );

      // No taxes left after remapping, falls back to default 15%
      expect(result.totalTax).toBe(150);
    });

    it('should apply multiple taxes and sum them', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-vat', scope: TaxScope.SALE },
        { taxId: 'tax-service', scope: TaxScope.SALE },
      ]);
      taxesRepository.findByIdOrNull.mockImplementation((_id: string) => {
        if (_id === 'tax-vat') {
          return Promise.resolve({
            id: 'tax-vat',
            nameEn: 'VAT',
            nameAr: 'ضريبة',
            type: TaxType.PERCENTAGE,
            amount: 15,
            isActive: true,
            saleAccountId: null,
            purchaseAccountId: null,
          });
        }
        if (_id === 'tax-service') {
          return Promise.resolve({
            id: 'tax-service',
            nameEn: 'Service Tax',
            nameAr: 'ضريبة خدمة',
            type: TaxType.FIXED,
            amount: 25,
            isActive: true,
            saleAccountId: null,
            purchaseAccountId: null,
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.calculateProductTax(tenantId, 1000, 'product-001');

      expect(result.totalTax).toBe(175); // 150 + 25
      expect(result.total).toBe(1175);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should round tax amounts to 2 decimal places', async () => {
      productTaxesRepository.findByProductId.mockResolvedValue([
        { taxId: 'tax-1', scope: TaxScope.SALE },
      ]);
      taxesRepository.findByIdOrNull.mockResolvedValue({
        id: 'tax-1',
        nameEn: 'Odd Rate',
        nameAr: 'ضريبة',
        type: TaxType.PERCENTAGE,
        amount: 7,
        isActive: true,
        saleAccountId: null,
        purchaseAccountId: null,
      });

      // 333 * 7 / 100 = 23.31
      const result = await service.calculateProductTax(tenantId, 333, 'product-001');

      expect(result.totalTax).toBe(23.31);
      expect(result.total).toBe(356.31);
    });
  });

  // ── applyMultipleTaxes ──────────────────────────────────────────────────

  describe('applyMultipleTaxes()', () => {
    it('should apply multiple tax rates to an amount', () => {
      const result = service.applyMultipleTaxes(1000, [
        { name: 'VAT', rate: 15 },
        { name: 'Service', rate: 5 },
      ]);

      expect(result.totalTax.toNumber()).toBe(200);
      expect(result.total.toNumber()).toBe(1200);
      expect(result.taxes).toHaveLength(2);
    });
  });
});
