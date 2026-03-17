jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { PosOrdersService } from './orders.service';
import { PosOrderStatus, OrderType } from '@/common/enums/pos.enums';
import { MAX_HELD_ORDERS } from '@/common/constants/pos.constants';

describe('PosOrdersService', () => {
  let service: PosOrdersService;
  let ordersRepository: Record<string, jest.Mock>;
  let orderItemsRepository: Record<string, jest.Mock>;
  let paymentsRepository: Record<string, jest.Mock>;
  let heldOrdersRepository: Record<string, jest.Mock>;
  let sessionsRepository: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;
  let orderItemsService: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const orderId = 'order-001';
  const sessionId = 'session-001';
  const auditContext = { userId: 'user-001', tenantId };

  const makeOrderRecord = (overrides: Record<string, unknown> = {}) => ({
    id: orderId,
    sessionId,
    partnerId: null,
    orderNumber: 'POS-00001',
    status: PosOrderStatus.OPEN,
    version: 1,
    discountAmount: 0,
    tipAmount: 0,
    deliveryFee: 0,
    ...overrides,
  });

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    ordersRepository = {
      findById: jest.fn().mockResolvedValue(makeOrderRecord()),
      create: jest.fn().mockResolvedValue(makeOrderRecord()),
      update: jest.fn().mockResolvedValue(undefined),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    orderItemsRepository = {
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    paymentsRepository = {
      findAllRaw: jest.fn().mockResolvedValue([]),
    };

    heldOrdersRepository = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'held-001' }),
      findById: jest.fn().mockResolvedValue({
        id: 'held-001',
        sessionId,
        cartSnapshot: [
          {
            productId: 'product-001',
            productName: 'Widget',
            unitPrice: 50,
            quantity: 2,
          },
        ],
      }),
      findAllRaw: jest.fn().mockResolvedValue([]),
      hardDelete: jest.fn().mockResolvedValue(undefined),
    };

    sessionsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: sessionId, status: PosOrderStatus.OPEN }),
    };

    sequencesService = {
      nextNumber: jest.fn().mockResolvedValue('POS-00001'),
    };

    orderItemsService = {
      getItemsByOrderId: jest.fn().mockResolvedValue([]),
      recalculateOrderTotals: jest.fn().mockResolvedValue(undefined),
    };

    service = new PosOrdersService(
      ordersRepository as any,
      orderItemsRepository as any,
      paymentsRepository as any,
      heldOrdersRepository as any,
      sessionsRepository as any,
      sequencesService as any,
      orderItemsService as any,
    );
  });

  // ---------------------------------------------------------------------------
  // CREATE ORDER
  // ---------------------------------------------------------------------------
  describe('create()', () => {
    it('should create order with partnerId (not customerId field in dto)', async () => {
      const dto = { partnerId: 'partner-001', orderType: OrderType.DINE_IN };

      await service.create(tenantId, dto as any, auditContext as any);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'partner-001',
          customerId: 'partner-001', // backward compat
          orderType: OrderType.DINE_IN,
          status: PosOrderStatus.OPEN,
        }),
        expect.anything(),
      );
    });

    it('should default orderType to TAKEAWAY when not provided', async () => {
      const dto = {};

      await service.create(tenantId, dto as any, auditContext as any);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ orderType: OrderType.TAKEAWAY }),
        expect.anything(),
      );
    });

    it('should throw when no open session exists for cashier', async () => {
      sessionsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(tenantId, {} as any, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate order number via sequencesService', async () => {
      await service.create(tenantId, {} as any, auditContext as any);

      expect(sequencesService.nextNumber).toHaveBeenCalledWith(tenantId, 'pos_order');
    });

    it('should initialize all amounts to 0', async () => {
      await service.create(tenantId, {} as any, auditContext as any);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          tipAmount: 0,
          totalAmount: 0,
          deliveryFee: 0,
        }),
        expect.anything(),
      );
    });

    it('should allow walk-in (no partnerId)', async () => {
      const dto = {};

      await service.create(tenantId, dto as any, auditContext as any);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ partnerId: null }),
        expect.anything(),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE ORDER
  // ---------------------------------------------------------------------------
  describe('update()', () => {
    it('should throw when order is not OPEN', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ status: PosOrderStatus.PAID }));

      await expect(
        service.update(tenantId, orderId, { version: 1 } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw on version conflict', async () => {
      await expect(
        service.update(tenantId, orderId, { version: 99 } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update partnerId and set customerId for backward compat', async () => {
      const dto = { version: 1, partnerId: 'new-partner' };

      // Mock findById for the final return
      ordersRepository.findById
        .mockResolvedValueOnce(makeOrderRecord()) // first call: validation
        .mockResolvedValueOnce(makeOrderRecord({ partnerId: 'new-partner' })); // findById in findById

      await service.update(tenantId, orderId, dto as any, auditContext as any);

      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          partnerId: 'new-partner',
          customerId: 'new-partner',
        }),
        expect.anything(),
      );
    });

    it('should recalculate totals when deliveryFee changes', async () => {
      ordersRepository.findById
        .mockResolvedValueOnce(makeOrderRecord()) // validation
        .mockResolvedValueOnce(makeOrderRecord({ deliveryFee: 15 })); // recalc

      const dto = { version: 1, deliveryFee: 15 };

      await service.update(tenantId, orderId, dto as any, auditContext as any);

      expect(orderItemsService.recalculateOrderTotals).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // VOID ORDER
  // ---------------------------------------------------------------------------
  describe('voidOrder()', () => {
    it('should set status to VOIDED', async () => {
      await service.voidOrder(tenantId, orderId, auditContext as any);

      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({ status: PosOrderStatus.VOIDED }),
        expect.anything(),
      );
    });

    it('should throw when order is not OPEN', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ status: PosOrderStatus.PAID }));

      await expect(service.voidOrder(tenantId, orderId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // HOLD ORDER
  // ---------------------------------------------------------------------------
  describe('holdOrder()', () => {
    it('should save cart snapshot and void the order', async () => {
      orderItemsService.getItemsByOrderId.mockResolvedValue([{ id: 'item-001' }]);

      const dto = { tabLabel: 'Table 5' };

      await service.holdOrder(tenantId, orderId, dto as any, auditContext as any);

      expect(heldOrdersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          tabLabel: 'Table 5',
          cartSnapshot: [{ id: 'item-001' }],
          createdBy: auditContext.userId,
        }),
        expect.anything(),
      );

      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({ status: PosOrderStatus.VOIDED }),
        expect.anything(),
      );
    });

    it('should throw when order is not OPEN', async () => {
      ordersRepository.findById.mockResolvedValue(
        makeOrderRecord({ status: PosOrderStatus.VOIDED }),
      );

      await expect(
        service.holdOrder(tenantId, orderId, { tabLabel: 'T1' } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when max held orders reached', async () => {
      heldOrdersRepository.count.mockResolvedValue(MAX_HELD_ORDERS);

      await expect(
        service.holdOrder(tenantId, orderId, { tabLabel: 'T1' } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should commit transaction on success', async () => {
      await service.holdOrder(tenantId, orderId, { tabLabel: 'T1' } as any, auditContext as any);

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      heldOrdersRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.holdOrder(tenantId, orderId, { tabLabel: 'T1' } as any, auditContext as any),
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // RESUME HELD ORDER
  // ---------------------------------------------------------------------------
  describe('resumeHeldOrder()', () => {
    it('should create new order with items from snapshot', async () => {
      ordersRepository.create.mockResolvedValue({ id: 'new-order-001' });

      await service.resumeHeldOrder(tenantId, 'held-001', auditContext as any);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PosOrderStatus.OPEN,
          orderType: OrderType.TAKEAWAY,
        }),
        expect.anything(),
      );

      expect(orderItemsRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              orderId: 'new-order-001',
              productId: 'product-001',
            }),
          ]),
        }),
      );
    });

    it('should delete the held order after resuming', async () => {
      ordersRepository.create.mockResolvedValue({ id: 'new-order-001' });

      await service.resumeHeldOrder(tenantId, 'held-001', auditContext as any);

      expect(heldOrdersRepository.hardDelete).toHaveBeenCalledWith(
        'held-001',
        expect.objectContaining({ tenantId }),
      );
    });

    it('should recalculate order totals after restoring items', async () => {
      ordersRepository.create.mockResolvedValue({ id: 'new-order-001' });

      await service.resumeHeldOrder(tenantId, 'held-001', auditContext as any);

      expect(orderItemsService.recalculateOrderTotals).toHaveBeenCalledWith(
        tenantId,
        'new-order-001',
        auditContext,
        mockTransaction,
      );
    });

    it('should throw when no open session exists', async () => {
      sessionsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resumeHeldOrder(tenantId, 'held-001', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback on failure', async () => {
      ordersRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.resumeHeldOrder(tenantId, 'held-001', auditContext as any),
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // LIST HELD ORDERS
  // ---------------------------------------------------------------------------
  describe('listHeldOrders()', () => {
    it('should return empty data when no open session', async () => {
      sessionsRepository.findOne.mockResolvedValue(null);

      const result = await service.listHeldOrders(tenantId, 'user-001');

      expect(result).toEqual({ data: [] });
    });

    it('should return held orders for current session', async () => {
      heldOrdersRepository.findAllRaw.mockResolvedValue([{ id: 'held-001' }]);

      const result = await service.listHeldOrders(tenantId, 'user-001');

      expect(result.data).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // FIND BY ID
  // ---------------------------------------------------------------------------
  describe('findById()', () => {
    it('should return order with items and payments', async () => {
      orderItemsService.getItemsByOrderId.mockResolvedValue([{ id: 'item-001' }]);
      paymentsRepository.findAllRaw.mockResolvedValue([{ id: 'payment-001' }]);

      const result = await service.findById(tenantId, orderId);

      expect(result.items).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
    });
  });
});
