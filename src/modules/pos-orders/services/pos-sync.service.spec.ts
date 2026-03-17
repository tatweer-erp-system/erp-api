jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { PosSyncService } from './pos-sync.service';
import {
  PosOrderStatus,
  PosSessionStatus,
  PaymentMethod,
  OrderType,
  ProductType,
} from '@/common/enums/pos.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';

describe('PosSyncService', () => {
  let service: PosSyncService;
  let ordersRepository: Record<string, jest.Mock>;
  let orderItemsRepository: Record<string, jest.Mock>;
  let paymentsRepository: Record<string, jest.Mock>;
  let sessionsRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let productVariantsRepository: Record<string, jest.Mock>;
  let tenantSettingsRepository: Record<string, jest.Mock>;
  let inventorySharedService: Record<string, jest.Mock>;
  let loyaltyService: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let journalPosterService: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const sessionId = 'session-001';
  const auditContext = { userId: 'user-001', tenantId };

  const makeOfflineOrder = (overrides: Record<string, unknown> = {}) => ({
    offlineId: 'offline-001',
    orderType: OrderType.TAKEAWAY,
    items: [
      {
        productId: 'product-001',
        quantity: 2,
        unitPrice: 50,
      },
    ],
    payments: [
      {
        method: PaymentMethod.CASH,
        amount: 115, // 100 subtotal + 15 tax
      },
    ],
    createdAt: '2026-03-14T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    ordersRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'order-001' }),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      rawQuery: jest.fn().mockResolvedValue([{ id: 'warehouse-001' }]),
    };

    orderItemsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'item-001' }),
    };

    paymentsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'payment-001' }),
    };

    sessionsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: sessionId, status: PosSessionStatus.OPEN }),
    };

    productsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'product-001',
        nameEn: 'Widget',
        nameAr: 'قطعة',
        productType: ProductType.STORABLE,
        taxRate: '15',
      }),
    };

    productVariantsRepository = {
      findById: jest.fn().mockResolvedValue(null),
    };

    tenantSettingsRepository = {
      findByKeyTenant: jest.fn().mockResolvedValue(null),
    };

    inventorySharedService = {
      createMovement: jest
        .fn()
        .mockResolvedValue({ id: 'movement-001', quantityBefore: 100, quantityAfter: 98 }),
      getStockLevel: jest.fn().mockResolvedValue([{ quantity: '100', averageCost: '10' }]),
    };

    loyaltyService = {
      earn: jest.fn().mockResolvedValue(undefined),
    };

    currencyService = {
      getBaseCurrency: jest.fn().mockResolvedValue({ id: 'currency-sar', code: 'SAR' }),
    };

    journalPosterService = {
      post: jest.fn().mockResolvedValue(undefined),
    };

    sequencesService = {
      nextNumber: jest.fn().mockResolvedValue('POS-00001'),
    };

    service = new PosSyncService(
      ordersRepository as any,
      orderItemsRepository as any,
      paymentsRepository as any,
      sessionsRepository as any,
      productsRepository as any,
      productVariantsRepository as any,
      tenantSettingsRepository as any,
      inventorySharedService as any,
      loyaltyService as any,
      currencyService as any,
      journalPosterService as any,
      sequencesService as any,
    );
  });

  // ---------------------------------------------------------------------------
  // BATCH PROCESSING
  // ---------------------------------------------------------------------------
  describe('syncBatch()', () => {
    it('should process all orders in batch and return correct counts', async () => {
      const order1 = makeOfflineOrder({ offlineId: 'offline-001' });
      const order2 = makeOfflineOrder({ offlineId: 'offline-002' });

      ordersRepository.findOne.mockResolvedValue(null);

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order1, order2] } as any,
        auditContext as any,
      );

      expect(result.total).toBe(2);
      expect(result.synced).toBe(2);
      expect(result.alreadySynced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should return correct counts with mixed results', async () => {
      const order1 = makeOfflineOrder({ offlineId: 'offline-001' });
      const order2 = makeOfflineOrder({ offlineId: 'offline-002' });

      ordersRepository.findOne
        .mockResolvedValueOnce({ id: 'existing-order' })
        .mockResolvedValueOnce(null);

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order1, order2] } as any,
        auditContext as any,
      );

      expect(result.total).toBe(2);
      expect(result.synced).toBe(1);
      expect(result.alreadySynced).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle failed orders without stopping batch', async () => {
      const order1 = makeOfflineOrder({
        offlineId: 'offline-001',
        items: [{ productId: 'nonexistent', quantity: 1, unitPrice: 50 }],
      });
      const order2 = makeOfflineOrder({ offlineId: 'offline-002' });

      productsRepository.findById
        .mockResolvedValueOnce(null) // order1: product not found
        .mockResolvedValue({
          // order2: normal product
          id: 'product-001',
          nameEn: 'Widget',
          productType: ProductType.STORABLE,
          taxRate: '15',
        });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order1, order2] } as any,
        auditContext as any,
      );

      expect(result.total).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.synced).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // IDEMPOTENCY (DEDUPLICATION BY offlineId)
  // ---------------------------------------------------------------------------
  describe('idempotency', () => {
    it("should return 'already_synced' when offlineId already exists in DB", async () => {
      ordersRepository.findOne.mockResolvedValue({ id: 'existing-order-id' });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('already_synced');
      expect(result.results[0].orderId).toBe('existing-order-id');
      expect(result.alreadySynced).toBe(1);
    });

    it('should not create transaction for already-synced orders', async () => {
      ordersRepository.findOne.mockResolvedValue({ id: 'existing-order-id' });

      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(ordersRepository.createTransaction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // STOCK VALIDATION
  // ---------------------------------------------------------------------------
  describe('stock validation', () => {
    it("should return 'failed' with reason when insufficient stock for storable product", async () => {
      inventorySharedService.createMovement.mockRejectedValue(
        new BadRequestException(
          'Insufficient stock for product "Widget". Available: 1, Required: 5',
        ),
      );

      const order = makeOfflineOrder({
        items: [{ productId: 'product-001', quantity: 5, unitPrice: 50 }],
      });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].failureReason).toBeDefined();
      expect(result.failed).toBe(1);
    });

    it('should skip stock deduction for consumable products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        nameEn: 'Napkins',
        productType: ProductType.CONSUMABLE,
        taxRate: '15',
      });

      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(inventorySharedService.createMovement).not.toHaveBeenCalled();
    });

    it('should skip stock deduction for service products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        nameEn: 'Delivery',
        productType: ProductType.SERVICE,
        taxRate: '15',
      });

      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(inventorySharedService.createMovement).not.toHaveBeenCalled();
    });

    it('should use POS_SALE movement type and POS_ORDER reference', async () => {
      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(inventorySharedService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          movementType: StockMovementType.POS_SALE,
          quantity: -2,
          referenceType: StockReferenceType.POS_ORDER,
        }),
        mockTransaction,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // SESSION VALIDATION
  // ---------------------------------------------------------------------------
  describe('session validation', () => {
    it("should return 'failed' when session not found", async () => {
      sessionsRepository.findOne.mockResolvedValue(null);

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('failed');
      expect(result.failed).toBe(1);
    });

    it("should return 'failed' when session is closed", async () => {
      sessionsRepository.findOne.mockResolvedValue({
        id: sessionId,
        status: PosSessionStatus.CLOSED,
      });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('failed');
      expect(result.failed).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // SUCCESSFUL SYNC
  // ---------------------------------------------------------------------------
  describe('successful sync', () => {
    it('should create order, items, and payments', async () => {
      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('synced');
      expect(ordersRepository.create).toHaveBeenCalledTimes(1);
      expect(orderItemsRepository.create).toHaveBeenCalledTimes(1);
      expect(paymentsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should set offlineId, syncedAt, and createdOfflineAt on the order', async () => {
      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.offlineId).toBe('offline-001');
      expect(createCall.syncedAt).toBeInstanceOf(Date);
      expect(createCall.createdOfflineAt).toBeInstanceOf(Date);
    });

    it("should return 'synced' with orderId", async () => {
      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('synced');
      expect(result.results[0].orderId).toBe('order-001');
    });

    it('should commit the transaction on success', async () => {
      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback the transaction on failure', async () => {
      ordersRepository.create.mockRejectedValue(new Error('DB error'));

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('failed');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should create order with status PAID', async () => {
      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.status).toBe(PosOrderStatus.PAID);
    });
  });

  // ---------------------------------------------------------------------------
  // PARTNER RESOLUTION (partnerId with customerId fallback)
  // ---------------------------------------------------------------------------
  describe('partner resolution', () => {
    it('should use partnerId from offline order', async () => {
      const order = makeOfflineOrder({ partnerId: 'partner-001' });

      await service.syncBatch(tenantId, { sessionId, orders: [order] } as any, auditContext as any);

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.partnerId).toBe('partner-001');
      expect(createCall.customerId).toBe('partner-001');
    });

    it('should fall back to customerId when partnerId is not set', async () => {
      const order = makeOfflineOrder({ customerId: 'customer-fallback' });

      await service.syncBatch(tenantId, { sessionId, orders: [order] } as any, auditContext as any);

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.partnerId).toBe('customer-fallback');
    });

    it('should set partnerId to null for walk-in orders', async () => {
      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.partnerId).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // VARIANT SUPPORT
  // ---------------------------------------------------------------------------
  describe('variant support for offline items', () => {
    it('should resolve variant when productVariantId is provided and valid', async () => {
      productVariantsRepository.findById.mockResolvedValue({
        id: 'variant-001',
        productId: 'product-001',
        priceExtra: 10,
      });

      const order = makeOfflineOrder({
        items: [
          {
            productId: 'product-001',
            productVariantId: 'variant-001',
            quantity: 2,
            unitPrice: 60,
          },
        ],
        payments: [{ method: PaymentMethod.CASH, amount: 138 }],
      });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('synced');
      expect(orderItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productVariantId: 'variant-001',
        }),
        expect.anything(),
      );
    });

    it('should warn when variant does not belong to product', async () => {
      productVariantsRepository.findById.mockResolvedValue({
        id: 'variant-001',
        productId: 'other-product',
        priceExtra: 10,
      });

      const order = makeOfflineOrder({
        items: [
          {
            productId: 'product-001',
            productVariantId: 'variant-001',
            quantity: 2,
            unitPrice: 50,
          },
        ],
      });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('synced');
      expect(result.results[0].warnings).toBeDefined();
      expect(result.results[0].warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('does not belong')]),
      );
    });

    it('should warn when variant is not found and proceed without', async () => {
      productVariantsRepository.findById.mockResolvedValue(null);

      const order = makeOfflineOrder({
        items: [
          {
            productId: 'product-001',
            productVariantId: 'nonexistent-variant',
            quantity: 2,
            unitPrice: 50,
          },
        ],
      });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('synced');
      expect(result.results[0].warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('not found')]),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PAYMENT VALIDATION
  // ---------------------------------------------------------------------------
  describe('payment validation', () => {
    it('should fail when payment total does not match calculated total', async () => {
      const order = makeOfflineOrder({
        payments: [{ method: PaymentMethod.CASH, amount: 999 }],
      });

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [order] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('failed');
    });
  });

  // ---------------------------------------------------------------------------
  // LOYALTY EARN
  // ---------------------------------------------------------------------------
  describe('loyalty earn', () => {
    it('should earn loyalty points when partnerId is set (tip excluded)', async () => {
      // subtotal=100, tip=10, tax=15, total=125
      const order = makeOfflineOrder({
        partnerId: 'partner-001',
        tipAmount: 10,
        discountAmount: 0,
        payments: [{ method: PaymentMethod.CASH, amount: 125 }],
      });

      await service.syncBatch(tenantId, { sessionId, orders: [order] } as any, auditContext as any);

      // earnBase = subtotal - discount = 100 - 0 = 100 (no tip)
      expect(loyaltyService.earn).toHaveBeenCalledWith(
        tenantId,
        'partner-001',
        'order-001',
        100,
        mockTransaction,
      );
    });

    it('should NOT earn loyalty points for walk-in orders', async () => {
      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(loyaltyService.earn).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // COGS JOURNAL
  // ---------------------------------------------------------------------------
  describe('COGS journal', () => {
    it('should post COGS journal when COA settings are configured', async () => {
      tenantSettingsRepository.findByKeyTenant
        .mockResolvedValueOnce({ value: 'cogs-account' })
        .mockResolvedValueOnce({ value: 'inventory-account' });

      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(journalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          referenceType: 'pos_order_cogs',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'cogs-account' }),
            expect.objectContaining({ accountId: 'inventory-account' }),
          ]),
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should NOT block sync if COGS posting fails', async () => {
      tenantSettingsRepository.findByKeyTenant
        .mockResolvedValueOnce({ value: 'cogs-account' })
        .mockResolvedValueOnce({ value: 'inventory-account' });
      journalPosterService.post.mockRejectedValue(new Error('Journal error'));

      const result = await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(result.results[0].status).toBe('synced');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should skip COGS when COA settings are not configured', async () => {
      tenantSettingsRepository.findByKeyTenant.mockResolvedValue(null);

      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      expect(journalPosterService.post).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // CURRENCY
  // ---------------------------------------------------------------------------
  describe('currency resolution', () => {
    it('should use base currency for all synced orders', async () => {
      await service.syncBatch(
        tenantId,
        { sessionId, orders: [makeOfflineOrder()] } as any,
        auditContext as any,
      );

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.currencyId).toBe('currency-sar');
      expect(createCall.exchangeRate).toBe(1);
      expect(createCall.totalAmountBase).toBe(createCall.totalAmount);
    });
  });
});
