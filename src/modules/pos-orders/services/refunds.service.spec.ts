jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { PosOrderStatus, OrderType, ProductType, RefundType } from '@/common/enums/pos.enums';
import { InvoiceTypeNew } from '@/common/enums/invoice.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { VAT_RATE } from '@/common/constants/pos.constants';

describe('RefundsService', () => {
  let service: RefundsService;
  let ordersRepository: Record<string, jest.Mock>;
  let orderItemsRepository: Record<string, jest.Mock>;
  let refundsRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let warehousesRepository: Record<string, jest.Mock>;
  let inventoryShared: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;
  let loyalty: Record<string, jest.Mock>;
  let voucherGiftCard: Record<string, jest.Mock>;
  let invoicesService: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const orderId = 'order-001';
  const sessionId = 'session-001';
  const partnerId = 'partner-001';
  const branchId = 'branch-001';
  const warehouseId = 'warehouse-001';
  const auditContext = { userId: 'user-001', tenantId };

  const makeOrderRecord = (overrides: Record<string, unknown> = {}) => ({
    id: orderId,
    sessionId,
    partnerId,
    customerId: partnerId,
    orderNumber: 'POS-00001',
    status: PosOrderStatus.PAID,
    orderType: OrderType.TAKEAWAY,
    subtotal: 200,
    discountAmount: 0,
    taxAmount: 30,
    tipAmount: 0,
    totalAmount: 230,
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
    taxRate: VAT_RATE,
    taxAmount: 30,
    lineTotal: 230,
    course: null,
    notes: null,
    ...overrides,
  });

  const makeRefundDto = (overrides: Record<string, unknown> = {}) => ({
    refundType: RefundType.FULL,
    reason: 'Customer returned items',
    approvedBy: 'manager-001',
    refundMethod: 'cash',
    ...overrides,
  });

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    ordersRepository = {
      findById: jest.fn().mockResolvedValue(makeOrderRecord()),
      create: jest.fn().mockResolvedValue({ id: 'refund-order-001' }),
      update: jest.fn().mockResolvedValue(undefined),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      rawQuery: jest.fn().mockResolvedValue([{ branchId }]),
    };

    orderItemsRepository = {
      findAllRaw: jest.fn().mockResolvedValue([makeItemRecord()]),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    refundsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'refund-001' }),
      findOne: jest.fn().mockResolvedValue({ id: 'refund-001' }),
    };

    productsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'product-001',
        productType: ProductType.STORABLE,
      }),
    };

    warehousesRepository = {
      findDefault: jest.fn().mockResolvedValue({ id: warehouseId }),
    };

    inventoryShared = {
      createMovement: jest.fn().mockResolvedValue({ id: 'movement-001' }),
    };

    sequencesService = {
      nextNumber: jest.fn().mockResolvedValue('POS-00002'),
    };

    loyalty = {
      reverseEarn: jest.fn().mockResolvedValue(undefined),
    };

    voucherGiftCard = {};

    invoicesService = {
      create: jest.fn().mockResolvedValue({ id: 'credit-note-001' }),
      post: jest.fn().mockResolvedValue(undefined),
    };

    service = new RefundsService(
      ordersRepository as any,
      orderItemsRepository as any,
      refundsRepository as any,
      productsRepository as any,
      warehousesRepository as any,
      inventoryShared as any,
      sequencesService as any,
      loyalty as any,
      voucherGiftCard as any,
      invoicesService as any,
    );
  });

  // ---------------------------------------------------------------------------
  // FULL REFUND
  // ---------------------------------------------------------------------------
  describe('full refund', () => {
    it('should create a refund order with negative amounts', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PosOrderStatus.REFUNDED,
          orderType: OrderType.TAKEAWAY,
          partnerId,
        }),
        expect.anything(),
      );

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.subtotal).toBeLessThan(0);
      expect(createCall.taxAmount).toBeLessThan(0);
      expect(createCall.totalAmount).toBeLessThan(0);
    });

    it('should insert refund items with negative quantities', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(orderItemsRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              orderId: 'refund-order-001',
              quantity: -2,
            }),
          ]),
        }),
      );
    });

    it('should create a refund record linking original and refund orders', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(refundsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalOrderId: orderId,
          refundOrderId: 'refund-order-001',
          refundType: RefundType.FULL,
          approvedBy: 'manager-001',
        }),
        expect.anything(),
      );
    });

    it('should update original order status to REFUNDED', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({ status: PosOrderStatus.REFUNDED }),
        expect.anything(),
      );
    });

    it('should restore stock via RETURN movement for storable products', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(inventoryShared.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId: 'product-001',
          warehouseId,
          movementType: StockMovementType.RETURN,
          quantity: 2, // positive = inbound
          referenceType: StockReferenceType.POS_ORDER,
        }),
        mockTransaction,
      );
    });

    it('should reverse loyalty points on full refund', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(loyalty.reverseEarn).toHaveBeenCalledWith(tenantId, orderId, mockTransaction);
    });

    it('should NOT reverse loyalty points on partial refund', async () => {
      const dto = makeRefundDto({
        refundType: RefundType.PARTIAL,
        items: [{ orderItemId: 'item-001', quantity: 1 }],
      });

      await service.refundOrder(tenantId, orderId, dto as any, auditContext as any);

      expect(loyalty.reverseEarn).not.toHaveBeenCalled();
    });

    it('should create credit note (out_refund) via InvoicesService', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(invoicesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          branchId,
          partnerId,
          invoiceType: InvoiceTypeNew.OUT_REFUND,
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should auto-post the credit note', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(invoicesService.post).toHaveBeenCalledWith(
        tenantId,
        'credit-note-001',
        auditContext,
        mockTransaction,
      );
    });

    it('should link credit note to refund order', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      const invoiceLinkCall = ordersRepository.update.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>).invoiceId !== undefined,
      );
      expect(invoiceLinkCall).toBeDefined();
      expect(invoiceLinkCall![1]).toMatchObject({ invoiceId: 'credit-note-001' });
    });

    it('should commit transaction on success', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // PARTIAL REFUND
  // ---------------------------------------------------------------------------
  describe('partial refund', () => {
    it('should refund only specified items and quantities', async () => {
      const dto = makeRefundDto({
        refundType: RefundType.PARTIAL,
        items: [{ orderItemId: 'item-001', quantity: 1 }],
      });

      await service.refundOrder(tenantId, orderId, dto as any, auditContext as any);

      const bulkCreateCall = orderItemsRepository.bulkCreate.mock.calls[0][0];
      expect(bulkCreateCall.data).toHaveLength(1);
      expect(bulkCreateCall.data[0].quantity).toBe(-1);
    });

    it('should calculate proportional discount for partial qty refund', async () => {
      orderItemsRepository.findAllRaw.mockResolvedValue([
        makeItemRecord({ discountAmount: 20, quantity: 2 }),
      ]);

      const dto = makeRefundDto({
        refundType: RefundType.PARTIAL,
        items: [{ orderItemId: 'item-001', quantity: 1 }],
      });

      await service.refundOrder(tenantId, orderId, dto as any, auditContext as any);

      const bulkCreateCall = orderItemsRepository.bulkCreate.mock.calls[0][0];
      // proportionalDiscount = (20 * 1) / 2 = 10
      expect(bulkCreateCall.data[0].discountAmount).toBe(-10);
    });

    it('should throw when partial refund has no items', async () => {
      const dto = makeRefundDto({ refundType: RefundType.PARTIAL, items: [] });

      await expect(
        service.refundOrder(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when refund quantity exceeds original quantity', async () => {
      const dto = makeRefundDto({
        refundType: RefundType.PARTIAL,
        items: [{ orderItemId: 'item-001', quantity: 5 }],
      });

      await expect(
        service.refundOrder(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when orderItemId is not found in order', async () => {
      const dto = makeRefundDto({
        refundType: RefundType.PARTIAL,
        items: [{ orderItemId: 'nonexistent-item', quantity: 1 }],
      });

      await expect(
        service.refundOrder(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // STOCK RESTORATION
  // ---------------------------------------------------------------------------
  describe('stock restoration', () => {
    it('should skip stock restore for consumable products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        productType: ProductType.CONSUMABLE,
      });

      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(inventoryShared.createMovement).not.toHaveBeenCalled();
    });

    it('should skip stock restore for service products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        productType: ProductType.SERVICE,
      });

      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      expect(inventoryShared.createMovement).not.toHaveBeenCalled();
    });

    it('should NOT block refund if stock return fails (warns only)', async () => {
      inventoryShared.createMovement.mockRejectedValue(new Error('Stock error'));

      const result = await service.refundOrder(
        tenantId,
        orderId,
        makeRefundDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR CASES
  // ---------------------------------------------------------------------------
  describe('refund errors', () => {
    it('should throw when order status is not PAID', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ status: PosOrderStatus.OPEN }));

      await expect(
        service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on failure', async () => {
      ordersRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any),
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // INVOICE RESILIENCE
  // ---------------------------------------------------------------------------
  describe('credit note resilience', () => {
    it('should NOT block refund if credit note creation fails', async () => {
      invoicesService.create.mockRejectedValue(new Error('Invoice error'));

      const result = await service.refundOrder(
        tenantId,
        orderId,
        makeRefundDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should NOT block refund if credit note posting fails', async () => {
      invoicesService.post.mockRejectedValue(new Error('Post error'));

      const result = await service.refundOrder(
        tenantId,
        orderId,
        makeRefundDto() as any,
        auditContext as any,
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // PARTNER RESOLUTION
  // ---------------------------------------------------------------------------
  describe('partner resolution', () => {
    it('should use partnerId from order', async () => {
      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.partnerId).toBe(partnerId);
    });

    it('should fall back to customerId when partnerId is null', async () => {
      ordersRepository.findById.mockResolvedValue(
        makeOrderRecord({ partnerId: null, customerId: 'customer-fallback' }),
      );

      await service.refundOrder(tenantId, orderId, makeRefundDto() as any, auditContext as any);

      const createCall = ordersRepository.create.mock.calls[0][0];
      expect(createCall.partnerId).toBe('customer-fallback');
    });
  });
});
