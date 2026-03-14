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

describe('PosSyncService', () => {
  let service: PosSyncService;
  let ordersRepository: Record<string, jest.Mock>;
  let orderItemsRepository: Record<string, jest.Mock>;
  let paymentsRepository: Record<string, jest.Mock>;
  let sessionsRepository: Record<string, jest.Mock>;
  let stockLevelsRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let warehousesRepository: Record<string, jest.Mock>;
  let tenantSettingsRepository: Record<string, jest.Mock>;
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
      rawQuery: jest.fn().mockResolvedValue(undefined),
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

    stockLevelsRepository = {
      findByProductAndWarehouse: jest
        .fn()
        .mockResolvedValue({ quantity: '100', averageCost: '10' }),
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

    warehousesRepository = {
      findDefault: jest.fn().mockResolvedValue({ id: 'warehouse-001', allowNegativeStock: false }),
    };

    tenantSettingsRepository = {
      findByKeyTenant: jest.fn().mockResolvedValue(null),
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
      stockLevelsRepository as any,
      productsRepository as any,
      warehousesRepository as any,
      tenantSettingsRepository as any,
      loyaltyService as any,
      currencyService as any,
      journalPosterService as any,
      sequencesService as any,
    );
  });

  describe('syncBatch()', () => {
    it('should process all orders in batch and return correct counts', async () => {
      const order1 = makeOfflineOrder({ offlineId: 'offline-001' });
      const order2 = makeOfflineOrder({ offlineId: 'offline-002' });

      // Second call: also not found (both are new)
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

      // First order: already exists
      ordersRepository.findOne
        .mockResolvedValueOnce({ id: 'existing-order' }) // order1 exists
        .mockResolvedValueOnce(null); // order2 does not exist

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
  });

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
  });

  describe('stock validation', () => {
    it("should return 'failed' with reason when insufficient stock for storable product", async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
        quantity: '1',
        averageCost: '10',
      });

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
  });

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
  });
});
