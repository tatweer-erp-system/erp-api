jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderItemsService } from './order-items.service';
import { PosOrderStatus } from '@/common/enums/pos.enums';

describe('OrderItemsService', () => {
  let service: OrderItemsService;
  let orderItemsRepository: Record<string, jest.Mock>;
  let ordersRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let productVariantsRepository: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const orderId = 'order-001';
  const auditContext = { userId: 'user-001', tenantId };

  const makeOrderRecord = (overrides: Record<string, unknown> = {}) => ({
    id: orderId,
    status: PosOrderStatus.OPEN,
    discountAmount: 0,
    tipAmount: 0,
    deliveryFee: 0,
    ...overrides,
  });

  const makeProduct = (overrides: Record<string, unknown> = {}) => ({
    id: 'product-001',
    nameEn: 'Widget',
    nameAr: 'قطعة',
    unitPrice: 50,
    taxRate: 15,
    hasVariants: false,
    ...overrides,
  });

  const makeVariant = (overrides: Record<string, unknown> = {}) => ({
    id: 'variant-001',
    productId: 'product-001',
    priceExtra: 10,
    ...overrides,
  });

  const makeItemRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'item-001',
    orderId,
    productId: 'product-001',
    productVariantId: null,
    productName: 'Widget',
    unitPrice: 50,
    quantity: 2,
    discountAmount: 0,
    taxRate: 15,
    taxAmount: 15,
    lineTotal: 115,
    course: null,
    notes: null,
    ...overrides,
  });

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    orderItemsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'item-001' }),
      findOne: jest.fn().mockResolvedValue(makeItemRecord()),
      findAllRaw: jest.fn().mockResolvedValue([makeItemRecord()]),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      rawQuery: jest.fn().mockResolvedValue(undefined),
    };

    ordersRepository = {
      findById: jest.fn().mockResolvedValue(makeOrderRecord()),
      update: jest.fn().mockResolvedValue(undefined),
    };

    productsRepository = {
      findById: jest.fn().mockResolvedValue(makeProduct()),
    };

    productVariantsRepository = {
      findById: jest.fn().mockResolvedValue(null),
    };

    service = new OrderItemsService(
      orderItemsRepository as any,
      ordersRepository as any,
      productsRepository as any,
      productVariantsRepository as any,
    );
  });

  // ---------------------------------------------------------------------------
  // ADD ITEM
  // ---------------------------------------------------------------------------
  describe('addItem()', () => {
    it('should create item with correct line total and tax', async () => {
      const dto = { productId: 'product-001', quantity: 3 };

      await service.addItem(tenantId, orderId, dto as any, auditContext as any);

      // unitPrice=50, qty=3, taxable=150, tax=22.5, lineTotal=172.5
      expect(orderItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          productId: 'product-001',
          productName: 'Widget',
          unitPrice: 50,
          quantity: 3,
          taxRate: 15,
          taxAmount: 22.5,
          lineTotal: 172.5,
        }),
        expect.anything(),
      );
    });

    it('should apply item-level discount before tax: tax = (price*qty - discount) * rate', async () => {
      const dto = { productId: 'product-001', quantity: 2, discountAmount: 20 };

      await service.addItem(tenantId, orderId, dto as any, auditContext as any);

      // taxable = 50*2 - 20 = 80, tax = 80*0.15 = 12, lineTotal = 92
      expect(orderItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discountAmount: 20,
          taxAmount: 12,
          lineTotal: 92,
        }),
        expect.anything(),
      );
    });

    it('should validate product exists', async () => {
      productsRepository.findById.mockResolvedValue(null);

      const dto = { productId: 'nonexistent', quantity: 1 };

      await expect(
        service.addItem(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if order is not OPEN', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ status: PosOrderStatus.PAID }));

      const dto = { productId: 'product-001', quantity: 1 };

      await expect(
        service.addItem(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate order totals after adding item', async () => {
      const dto = { productId: 'product-001', quantity: 1 };

      await service.addItem(tenantId, orderId, dto as any, auditContext as any);

      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          subtotal: expect.any(Number),
          taxAmount: expect.any(Number),
          totalAmount: expect.any(Number),
        }),
        expect.anything(),
      );
    });

    it('should commit transaction on success', async () => {
      const dto = { productId: 'product-001', quantity: 1 };

      await service.addItem(tenantId, orderId, dto as any, auditContext as any);

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      productsRepository.findById.mockRejectedValue(new Error('DB error'));

      const dto = { productId: 'product-001', quantity: 1 };

      await expect(
        service.addItem(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // VARIANT HANDLING
  // ---------------------------------------------------------------------------
  describe('variant handling', () => {
    it('should add priceExtra from variant to base price', async () => {
      productVariantsRepository.findById.mockResolvedValue(makeVariant());

      const dto = { productId: 'product-001', productVariantId: 'variant-001', quantity: 1 };

      await service.addItem(tenantId, orderId, dto as any, auditContext as any);

      // unitPrice = 50 + 10 (priceExtra) = 60
      expect(orderItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productVariantId: 'variant-001',
          unitPrice: 60,
        }),
        expect.anything(),
      );
    });

    it('should throw when product hasVariants=true but no variantId provided', async () => {
      productsRepository.findById.mockResolvedValue(makeProduct({ hasVariants: true }));

      const dto = { productId: 'product-001', quantity: 1 };

      await expect(
        service.addItem(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when variant not found', async () => {
      productVariantsRepository.findById.mockResolvedValue(null);

      const dto = { productId: 'product-001', productVariantId: 'nonexistent', quantity: 1 };

      await expect(
        service.addItem(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when variant belongs to a different product', async () => {
      productVariantsRepository.findById.mockResolvedValue(
        makeVariant({ productId: 'other-product' }),
      );

      const dto = { productId: 'product-001', productVariantId: 'variant-001', quantity: 1 };

      await expect(
        service.addItem(tenantId, orderId, dto as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE ITEM
  // ---------------------------------------------------------------------------
  describe('updateItem()', () => {
    it('should recalculate totals when quantity changes', async () => {
      const dto = { quantity: 5 };

      await service.updateItem(tenantId, orderId, 'item-001', dto as any, auditContext as any);

      // unitPrice=50, qty=5, taxable=250, tax=37.5, lineTotal=287.5
      expect(orderItemsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pos_order_items'),
        expect.objectContaining({
          quantity: 5,
          taxAmount: 37.5,
          lineTotal: 287.5,
        }),
        mockTransaction,
      );
    });

    it('should recalculate totals when discount changes', async () => {
      const dto = { discountAmount: 10 };

      await service.updateItem(tenantId, orderId, 'item-001', dto as any, auditContext as any);

      // unitPrice=50, qty=2, discount=10, taxable=90, tax=13.5, lineTotal=103.5
      expect(orderItemsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pos_order_items'),
        expect.objectContaining({
          discountAmount: 10,
          taxAmount: 13.5,
          lineTotal: 103.5,
        }),
        mockTransaction,
      );
    });

    it('should throw if item not found in order', async () => {
      orderItemsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(tenantId, orderId, 'nonexistent', {} as any, auditContext as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if order is not OPEN', async () => {
      ordersRepository.findById.mockResolvedValue(
        makeOrderRecord({ status: PosOrderStatus.VOIDED }),
      );

      await expect(
        service.updateItem(tenantId, orderId, 'item-001', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate order totals after update', async () => {
      await service.updateItem(
        tenantId,
        orderId,
        'item-001',
        { quantity: 3 } as any,
        auditContext as any,
      );

      expect(ordersRepository.update).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // REMOVE ITEM
  // ---------------------------------------------------------------------------
  describe('removeItem()', () => {
    it('should delete item and recalculate order totals', async () => {
      await service.removeItem(tenantId, orderId, 'item-001', auditContext as any);

      expect(orderItemsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM pos_order_items'),
        expect.objectContaining({ itemId: 'item-001', orderId }),
        mockTransaction,
      );
      expect(ordersRepository.update).toHaveBeenCalled();
    });

    it('should throw if item not found', async () => {
      orderItemsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem(tenantId, orderId, 'nonexistent', auditContext as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if order is not OPEN', async () => {
      ordersRepository.findById.mockResolvedValue(
        makeOrderRecord({ status: PosOrderStatus.REFUNDED }),
      );

      await expect(
        service.removeItem(tenantId, orderId, 'item-001', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback on failure', async () => {
      orderItemsRepository.rawQuery.mockRejectedValue(new Error('DB error'));

      await expect(
        service.removeItem(tenantId, orderId, 'item-001', auditContext as any),
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // RECALCULATE ORDER TOTALS
  // ---------------------------------------------------------------------------
  describe('recalculateOrderTotals()', () => {
    it('should compute subtotal + tax + total correctly from all items', async () => {
      // Two items: 50*2=100 each, total subtotal=200
      orderItemsRepository.findAllRaw.mockResolvedValue([
        makeItemRecord({ unitPrice: 50, quantity: 2, discountAmount: 0 }),
        makeItemRecord({ id: 'item-002', unitPrice: 30, quantity: 3, discountAmount: 10 }),
      ]);

      const transaction = mockTransaction as any;

      await service.recalculateOrderTotals(tenantId, orderId, auditContext as any, transaction);

      // item1: 50*2 = 100
      // item2: 30*3 - 10 = 80
      // subtotal = 180
      // tax = (180 - 0) * 15/100 = 27
      // total = 180 + 27 = 207
      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          subtotal: 180,
          taxAmount: 27,
          totalAmount: 207,
        }),
        expect.anything(),
      );
    });

    it('should include tip and delivery fee in total', async () => {
      ordersRepository.findById.mockResolvedValue(
        makeOrderRecord({ tipAmount: 10, deliveryFee: 5 }),
      );

      const transaction = mockTransaction as any;

      await service.recalculateOrderTotals(tenantId, orderId, auditContext as any, transaction);

      // subtotal=100, tax=15, tip=10, deliveryFee=5, total=130
      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          totalAmount: 130,
        }),
        expect.anything(),
      );
    });

    it('should subtract order-level discount from tax base', async () => {
      ordersRepository.findById.mockResolvedValue(makeOrderRecord({ discountAmount: 20 }));

      const transaction = mockTransaction as any;

      await service.recalculateOrderTotals(tenantId, orderId, auditContext as any, transaction);

      // subtotal=100, discount=20, taxable=80, tax=12, total=80+12=92
      expect(ordersRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          subtotal: 100,
          taxAmount: 12,
          totalAmount: 92,
        }),
        expect.anything(),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET ITEMS
  // ---------------------------------------------------------------------------
  describe('getItemsByOrderId()', () => {
    it('should return items ordered by createdAt ASC', async () => {
      await service.getItemsByOrderId(orderId);

      expect(orderItemsRepository.findAllRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId },
          order: [['createdAt', 'ASC']],
        }),
      );
    });
  });
});
