jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { PosCheckoutService } from './checkout.service';
import { PosOrderStatus, PaymentMethod, DiscountType, ProductType } from '@/common/enums/pos.enums';
import { InvoiceTypeNew } from '@/common/enums/invoice.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { VAT_RATE } from '@/common/constants/pos.constants';

describe('PosCheckoutService', () => {
  let service: PosCheckoutService;
  let ordersRepository: Record<string, jest.Mock>;
  let orderItemsRepository: Record<string, jest.Mock>;
  let paymentsRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let warehousesRepository: Record<string, jest.Mock>;
  let partnersRepository: Record<string, jest.Mock>;
  let voucherGiftCard: Record<string, jest.Mock>;
  let loyalty: Record<string, jest.Mock>;
  let inventoryShared: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let journalPosterService: Record<string, jest.Mock>;
  let tenantSettingsRepository: Record<string, jest.Mock>;
  let invoicesService: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const orderId = 'order-001';
  const sessionId = 'session-001';
  const partnerId = 'partner-001';
  const warehouseId = 'warehouse-001';
  const branchId = 'branch-001';
  const auditContext = { userId: 'user-001', tenantId };

  // Helper: item with storable product at 100 SAR x 2 = 200 subtotal
  const makeOrderRecord = (overrides: Record<string, unknown> = {}) => ({
    id: orderId,
    sessionId,
    partnerId,
    orderNumber: 'POS-00001',
    status: PosOrderStatus.OPEN,
    deliveryFee: 0,
    ...overrides,
  });

  const makeItemRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'item-001',
    orderId,
    productId: 'product-001',
    productVariantId: null,
    productName: 'Widget',
    unitPrice: 100,
    quantity: 2,
    discountAmount: 0,
    taxRate: 15,
    taxAmount: 30,
    lineTotal: 230,
    ...overrides,
  });

  // subtotal=200, tax=30 (200*15/100), total=230
  const makeCheckoutDto = (overrides: Record<string, unknown> = {}) => ({
    payments: [{ method: PaymentMethod.CASH, amount: 230 }],
    ...overrides,
  });

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    ordersRepository = {
      findById: jest.fn().mockResolvedValue(makeOrderRecord()),
      update: jest.fn().mockResolvedValue(undefined),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      rawQuery: jest.fn().mockResolvedValue([{ branchId }]),
    };

    orderItemsRepository = {
      findAllRaw: jest.fn().mockResolvedValue([makeItemRecord()]),
    };

    paymentsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'payment-001' }),
      findAllRaw: jest.fn().mockResolvedValue([]),
    };

    productsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'product-001',
        nameEn: 'Widget',
        productType: ProductType.STORABLE,
        taxRate: '15',
      }),
    };

    warehousesRepository = {
      findDefault: jest.fn().mockResolvedValue({ id: warehouseId }),
    };

    partnersRepository = {
      findOneById: jest.fn().mockResolvedValue({ id: partnerId, nameEn: 'John' }),
    };

    voucherGiftCard = {
      validateVoucher: jest
        .fn()
        .mockResolvedValue({ valid: true, discountAmount: 10, voucherId: 'voucher-001' }),
      redeemVoucher: jest.fn().mockResolvedValue(undefined),
      redeemGiftCard: jest.fn().mockResolvedValue({ remainingToPay: 0 }),
    };

    loyalty = {
      earn: jest.fn().mockResolvedValue(undefined),
      redeem: jest.fn().mockResolvedValue({ sarValue: 50 }),
    };

    inventoryShared = {
      createMovement: jest.fn().mockResolvedValue({ id: 'movement-001' }),
      getStockLevel: jest.fn().mockResolvedValue([{ quantity: '100', averageCost: '10' }]),
    };

    currencyService = {
      getBaseCurrency: jest.fn().mockResolvedValue({ id: 'currency-sar', code: 'SAR' }),
      getRate: jest.fn().mockResolvedValue(3.75),
    };

    journalPosterService = {
      post: jest.fn().mockResolvedValue(undefined),
    };

    tenantSettingsRepository = {
      findByKeyTenant: jest.fn().mockResolvedValue(null),
    };

    invoicesService = {
      create: jest.fn().mockResolvedValue({ id: 'invoice-001' }),
      post: jest.fn().mockResolvedValue(undefined),
    };

    notificationsService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    service = new PosCheckoutService(
      ordersRepository as any,
      orderItemsRepository as any,
      paymentsRepository as any,
      productsRepository as any,
      warehousesRepository as any,
      partnersRepository as any,
      voucherGiftCard as any,
      loyalty as any,
      inventoryShared as any,
      currencyService as any,
      journalPosterService as any,
      tenantSettingsRepository as any,
      invoicesService as any,
      notificationsService as any,
    );
  });

  // ---------------------------------------------------------------------------
  // SUCCESS FLOW
  // ---------------------------------------------------------------------------
  describe('checkout success flow', () => {
    it('should commit transaction and return paid order on success', async () => {
      const result = await service.checkout(
        tenantId,
        orderId,
        makeCheckoutDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.invoiceId).toBe('invoice-001');
    });

    it('should update order status to PAID with correct amounts', async () => {
      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[0]).toBe(orderId);
      expect(updateCall[1]).toMatchObject({
        status: PosOrderStatus.PAID,
        subtotal: 200,
        taxAmount: 30,
        totalAmount: 230,
      });
    });

    it('should insert payment records for each payment in the dto', async () => {
      const dto = makeCheckoutDto({
        payments: [
          { method: PaymentMethod.CASH, amount: 130 },
          { method: PaymentMethod.CARD, amount: 100 },
        ],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(paymentsRepository.create).toHaveBeenCalledTimes(2);
      expect(paymentsRepository.create.mock.calls[0][0]).toMatchObject({
        method: PaymentMethod.CASH,
        amount: 130,
      });
      expect(paymentsRepository.create.mock.calls[1][0]).toMatchObject({
        method: PaymentMethod.CARD,
        amount: 100,
      });
    });

    it('should deduct stock for storable products via InventorySharedService', async () => {
      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(inventoryShared.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId: 'product-001',
          warehouseId,
          movementType: StockMovementType.POS_SALE,
          quantity: -2,
          referenceId: orderId,
          referenceType: StockReferenceType.POS_ORDER,
        }),
        mockTransaction,
      );
    });

    it('should skip stock deduction for consumable products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        productType: ProductType.CONSUMABLE,
      });

      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(inventoryShared.createMovement).not.toHaveBeenCalled();
    });

    it('should skip stock deduction for service products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        productType: ProductType.SERVICE,
      });

      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(inventoryShared.createMovement).not.toHaveBeenCalled();
    });

    it('should earn loyalty points on base amount EXCLUDING tip', async () => {
      const dto = makeCheckoutDto({
        tipAmount: 20,
        payments: [{ method: PaymentMethod.CASH, amount: 250 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      // earnBase = subtotal - discount = 200 - 0 = 200 (no tip)
      expect(loyalty.earn).toHaveBeenCalledWith(tenantId, partnerId, orderId, 200, mockTransaction);
    });

    it('should create simplified invoice (out_invoice) via InvoicesService', async () => {
      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(invoicesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          branchId,
          partnerId,
          invoiceType: InvoiceTypeNew.OUT_INVOICE,
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should auto-post the created invoice', async () => {
      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(invoicesService.post).toHaveBeenCalledWith(
        tenantId,
        'invoice-001',
        auditContext,
        mockTransaction,
      );
    });

    it('should link invoiceId to the order after invoice creation', async () => {
      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      // The second update call links invoiceId
      const invoiceLinkCall = ordersRepository.update.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>).invoiceId !== undefined,
      );
      expect(invoiceLinkCall).toBeDefined();
      expect(invoiceLinkCall![1]).toMatchObject({ invoiceId: 'invoice-001' });
    });

    it('should resolve default warehouse when dto.warehouseId is not provided', async () => {
      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(warehousesRepository.findDefault).toHaveBeenCalledWith(tenantId);
    });

    it('should use dto.warehouseId when provided', async () => {
      const dto = makeCheckoutDto({ warehouseId: 'custom-warehouse' });
      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(warehousesRepository.findDefault).not.toHaveBeenCalled();
      expect(inventoryShared.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ warehouseId: 'custom-warehouse' }),
        mockTransaction,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PAYMENT TYPES
  // ---------------------------------------------------------------------------
  describe('checkout with payments', () => {
    it('should process cash payment with change calculation', async () => {
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.CASH, amount: 230, amountGiven: 300 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(paymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          method: PaymentMethod.CASH,
          amount: 230,
          amountGiven: 300,
          changeAmount: 70,
        }),
        expect.anything(),
      );
    });

    it('should process card payment', async () => {
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.CARD, amount: 230, reference: 'TXN-123' }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(paymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          method: PaymentMethod.CARD,
          amount: 230,
          reference: 'TXN-123',
        }),
        expect.anything(),
      );
    });

    it('should process split payment (cash + card)', async () => {
      const dto = makeCheckoutDto({
        payments: [
          { method: PaymentMethod.CASH, amount: 130 },
          { method: PaymentMethod.CARD, amount: 100 },
        ],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(paymentsRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should redeem loyalty points when payment method is LOYALTY_POINTS', async () => {
      const dto = makeCheckoutDto({
        payments: [
          { method: PaymentMethod.LOYALTY_POINTS, amount: 50, pointsToRedeem: 500 },
          { method: PaymentMethod.CASH, amount: 180 },
        ],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(loyalty.redeem).toHaveBeenCalledWith(
        tenantId,
        partnerId,
        orderId,
        500,
        230,
        mockTransaction,
      );
    });

    it('should redeem gift card and succeed when balance covers payment', async () => {
      const dto = makeCheckoutDto({
        payments: [
          { method: PaymentMethod.GIFT_CARD, amount: 100, giftCardCode: 'GC-001' },
          { method: PaymentMethod.CASH, amount: 130 },
        ],
      });

      voucherGiftCard.redeemGiftCard.mockResolvedValue({ remainingToPay: 0 });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(voucherGiftCard.redeemGiftCard).toHaveBeenCalledWith(
        tenantId,
        'GC-001',
        100,
        orderId,
        mockTransaction,
      );
    });

    it('should throw when gift card has insufficient balance', async () => {
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.GIFT_CARD, amount: 230, giftCardCode: 'GC-001' }],
      });

      voucherGiftCard.redeemGiftCard.mockResolvedValue({ remainingToPay: 30 });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when gift card payment has no giftCardCode', async () => {
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.GIFT_CARD, amount: 230 }],
      });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply voucher discount before tax calculation', async () => {
      voucherGiftCard.validateVoucher.mockResolvedValue({
        valid: true,
        discountAmount: 20,
        voucherId: 'voucher-001',
      });

      // subtotal=200, voucherDiscount=20, taxable=180, tax=27, total=207
      const dto = makeCheckoutDto({
        voucherCode: 'SAVE20',
        payments: [{ method: PaymentMethod.CASH, amount: 207 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        discountAmount: 20,
        taxAmount: 27,
        totalAmount: 207,
      });
    });

    it('should record voucher redemption after checkout', async () => {
      voucherGiftCard.validateVoucher.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        voucherId: 'voucher-001',
      });

      const dto = makeCheckoutDto({
        voucherCode: 'SAVE10',
        payments: [{ method: PaymentMethod.CASH, amount: 218.5 }],
      });

      // subtotal=200, voucherDiscount=10, taxable=190, tax=28.5, total=218.5
      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(voucherGiftCard.redeemVoucher).toHaveBeenCalledWith(
        'voucher-001',
        orderId,
        partnerId,
        10,
        mockTransaction,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // DISCOUNT & TAX
  // ---------------------------------------------------------------------------
  describe('discount and tax calculations', () => {
    it('should apply percent discount correctly: tax = (subtotal - discount) * rate', async () => {
      // subtotal=200, 10% discount=20, taxable=180, tax=27, total=207
      const dto = makeCheckoutDto({
        discount: { type: DiscountType.PERCENT, value: 10 },
        payments: [{ method: PaymentMethod.CASH, amount: 207 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1].discountAmount).toBe(20);
      expect(updateCall[1].taxAmount).toBe(27);
      expect(updateCall[1].totalAmount).toBe(207);
    });

    it('should apply fixed discount correctly', async () => {
      // subtotal=200, fixed discount=50, taxable=150, tax=22.5, total=172.5
      const dto = makeCheckoutDto({
        discount: { type: DiscountType.FIXED, value: 50 },
        payments: [{ method: PaymentMethod.CASH, amount: 172.5 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1].discountAmount).toBe(50);
      expect(updateCall[1].taxAmount).toBe(22.5);
      expect(updateCall[1].totalAmount).toBe(172.5);
    });

    it('should cap fixed discount at subtotal value', async () => {
      // subtotal=200, fixed discount=500 → capped to 200, taxable=0, tax=0, total=0
      const dto = makeCheckoutDto({
        discount: { type: DiscountType.FIXED, value: 500 },
        payments: [{ method: PaymentMethod.CASH, amount: 0 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1].discountAmount).toBe(200);
      expect(updateCall[1].totalAmount).toBe(0);
    });

    it('should include tip in total but NOT in loyalty earn base', async () => {
      // subtotal=200, tip=30, tax=30, total=260
      const dto = makeCheckoutDto({
        tipAmount: 30,
        payments: [{ method: PaymentMethod.CASH, amount: 260 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1].tipAmount).toBe(30);
      expect(updateCall[1].totalAmount).toBe(260);

      // Loyalty earn base = subtotal - discount = 200 (no tip)
      expect(loyalty.earn).toHaveBeenCalledWith(tenantId, partnerId, orderId, 200, mockTransaction);
    });

    it('should include delivery fee in total', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ deliveryFee: 15 }));
      // subtotal=200, tax=30, deliveryFee=15, total=245
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.CASH, amount: 245 }],
      });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1].totalAmount).toBe(245);
    });
  });

  // ---------------------------------------------------------------------------
  // WALK-IN (NO PARTNER)
  // ---------------------------------------------------------------------------
  describe('walk-in sale (no partnerId)', () => {
    it('should succeed without a partnerId', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ partnerId: null }));

      const result = await service.checkout(
        tenantId,
        orderId,
        makeCheckoutDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip loyalty earn when no partnerId', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ partnerId: null }));

      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(loyalty.earn).not.toHaveBeenCalled();
    });

    it('should use branch as placeholder partner in invoice for walk-in', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ partnerId: null }));

      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(invoicesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ partnerId: branchId }),
        auditContext,
        mockTransaction,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // MULTI-CURRENCY
  // ---------------------------------------------------------------------------
  describe('multi-currency checkout', () => {
    it('should resolve foreign currency exchange rate', async () => {
      const dto = makeCheckoutDto({ currencyId: 'currency-usd' });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      expect(currencyService.getRate).toHaveBeenCalledWith(
        tenantId,
        'currency-usd',
        'currency-sar',
      );
    });

    it('should store totalAmountBase for foreign currency', async () => {
      currencyService.getRate.mockResolvedValue(3.75);
      const dto = makeCheckoutDto({ currencyId: 'currency-usd' });

      await service.checkout(tenantId, orderId, dto as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1].currencyId).toBe('currency-usd');
      expect(updateCall[1].exchangeRate).toBe(3.75);
      // totalAmountBase = totalAmount * exchangeRate
      expect(updateCall[1].totalAmountBase).toBe(Math.round(230 * 3.75 * 100) / 100);
    });

    it('should default to base currency when no currencyId provided', async () => {
      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      const updateCall = ordersRepository.update.mock.calls[0];
      expect(updateCall[1].currencyId).toBe('currency-sar');
      expect(updateCall[1].exchangeRate).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // COGS JOURNAL
  // ---------------------------------------------------------------------------
  describe('COGS journal posting', () => {
    it('should post COGS journal when COA settings are configured', async () => {
      tenantSettingsRepository.findByKeyTenant
        .mockResolvedValueOnce({ value: 'cogs-account-id' })
        .mockResolvedValueOnce({ value: 'inventory-account-id' });

      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(journalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          referenceType: 'pos_order_cogs',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'cogs-account-id', debit: 20 }),
            expect.objectContaining({ accountId: 'inventory-account-id', credit: 20 }),
          ]),
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should skip COGS journal when COA settings are not configured', async () => {
      tenantSettingsRepository.findByKeyTenant.mockResolvedValue(null);

      await service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any);

      expect(journalPosterService.post).not.toHaveBeenCalled();
    });

    it('should NOT block checkout if COGS posting fails', async () => {
      tenantSettingsRepository.findByKeyTenant
        .mockResolvedValueOnce({ value: 'cogs-account-id' })
        .mockResolvedValueOnce({ value: 'inventory-account-id' });
      journalPosterService.post.mockRejectedValue(new Error('Journal error'));

      const result = await service.checkout(
        tenantId,
        orderId,
        makeCheckoutDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR CASES
  // ---------------------------------------------------------------------------
  describe('checkout errors', () => {
    it('should throw when order status is not OPEN', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ status: PosOrderStatus.PAID }));

      await expect(
        service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw when order has no items', async () => {
      orderItemsRepository.findAllRaw.mockResolvedValue([]);

      await expect(
        service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when payment total does not match order total', async () => {
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.CASH, amount: 100 }],
      });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when cash amountGiven is less than amount', async () => {
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.CASH, amount: 230, amountGiven: 200 }],
      });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when voucher/loyalty used without customer', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ partnerId: null }));
      const dto = makeCheckoutDto({ voucherCode: 'SAVE10' });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when loyalty payment used without customer', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ partnerId: null }));
      const dto = makeCheckoutDto({
        payments: [{ method: PaymentMethod.LOYALTY_POINTS, amount: 230, pointsToRedeem: 2300 }],
      });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when voucher is invalid', async () => {
      voucherGiftCard.validateVoucher.mockResolvedValue({ valid: false, error: 'Expired' });

      const dto = makeCheckoutDto({ voucherCode: 'EXPIRED' });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when loyalty redeem sarValue does not match payment amount', async () => {
      loyalty.redeem.mockResolvedValue({ sarValue: 30 }); // expected 50

      const dto = makeCheckoutDto({
        payments: [
          { method: PaymentMethod.LOYALTY_POINTS, amount: 50, pointsToRedeem: 500 },
          { method: PaymentMethod.CASH, amount: 180 },
        ],
      });

      await expect(
        service.checkout(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when stock is insufficient for storable product', async () => {
      inventoryShared.createMovement.mockRejectedValue(new Error('Insufficient stock'));

      await expect(
        service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on any failure', async () => {
      ordersRepository.findById.mockRejectedValue(new Error('DB error'));

      await expect(
        service.checkout(tenantId, orderId, makeCheckoutDto() as any, auditContext as any),
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // INVOICE RESILIENCE
  // ---------------------------------------------------------------------------
  describe('invoice creation resilience', () => {
    it('should NOT block checkout if invoice creation fails', async () => {
      invoicesService.create.mockRejectedValue(new Error('Invoice error'));

      const result = await service.checkout(
        tenantId,
        orderId,
        makeCheckoutDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.invoiceId).toBeNull();
    });

    it('should NOT block checkout if invoice posting fails', async () => {
      invoicesService.post.mockRejectedValue(new Error('Post error'));

      const result = await service.checkout(
        tenantId,
        orderId,
        makeCheckoutDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.invoiceId).toBe('invoice-001');
    });
  });

  // ---------------------------------------------------------------------------
  // CONTAINER TRANSACTION
  // ---------------------------------------------------------------------------
  describe('container transaction handling', () => {
    it('should not commit/rollback when containerTransaction is provided', async () => {
      const externalTx = { commit: jest.fn(), rollback: jest.fn() };
      ordersRepository.createTransaction.mockResolvedValue(externalTx);

      await service.checkout(
        tenantId,
        orderId,
        makeCheckoutDto() as any,
        auditContext as any,
        externalTx as any,
      );

      expect(externalTx.commit).not.toHaveBeenCalled();
      expect(externalTx.rollback).not.toHaveBeenCalled();
    });
  });
});
