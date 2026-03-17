jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException, ConflictException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  PurchaseOrderStatus,
  PurchaseOrderBillStatus,
  PurchaseOrderReceiptStatus,
} from '@/common/enums/purchasing.enums';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let purchaseOrdersRepository: Record<string, jest.Mock>;
  let purchaseOrderLinesRepository: Record<string, jest.Mock>;
  let partnersRepository: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let statusTransitionService: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let receiptsService: Record<string, jest.Mock>;
  let invoicesService: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001', tenantId };

  const makeCreateDto = (overrides: Record<string, unknown> = {}) => ({
    partnerId: 'partner-001',
    branchId: 'branch-001',
    lines: [
      {
        productId: 'product-001',
        quantity: 10,
        unitPrice: 50,
        description: 'Raw material',
      },
    ],
    ...overrides,
  });

  const makeDraftPO = (overrides: Record<string, unknown> = {}) => ({
    id: 'po-001',
    orderNumber: 'PO-00001',
    partnerId: 'partner-001',
    vendorId: 'partner-001',
    branchId: 'branch-001',
    status: PurchaseOrderStatus.DRAFT,
    billStatus: PurchaseOrderBillStatus.NOTHING,
    receiptStatus: PurchaseOrderReceiptStatus.NOTHING,
    subtotal: '500',
    taxAmount: '75',
    totalAmount: '575',
    totalAmountBase: null,
    currencyId: null,
    exchangeRate: '1',
    discountAmount: '0',
    paymentTermId: null,
    version: 0,
    expectedDeliveryDate: null,
    ...overrides,
  });

  const makeConfirmedPO = (overrides: Record<string, unknown> = {}) =>
    makeDraftPO({
      status: PurchaseOrderStatus.CONFIRMED,
      ...overrides,
    });

  const makePOLines = (overrides: Record<string, unknown>[] = [{}]) =>
    overrides.map((o, i) => ({
      id: `line-${i + 1}`,
      orderId: 'po-001',
      productId: 'product-001',
      productVariantId: null,
      description: 'Raw material',
      quantity: '10',
      unitPrice: '50',
      taxAmount: '75',
      lineTotal: '575',
      lineTotalBase: null,
      discountAmount: '0',
      receivedQuantity: '0',
      qtyBilled: '0',
      ...o,
    }));

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    const mockSequelize = {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
      query: jest.fn(),
    };

    purchaseOrdersRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findOneById: jest.fn().mockResolvedValue(makeDraftPO()),
      insertOrder: jest.fn().mockResolvedValue('po-001'),
      updateOrder: jest.fn().mockResolvedValue(undefined),
      softDeleteOrder: jest.fn().mockResolvedValue(undefined),
      getSequelize: jest.fn().mockReturnValue(mockSequelize),
    };

    purchaseOrderLinesRepository = {
      findByOrderIdTenant: jest.fn().mockResolvedValue(makePOLines()),
      insertLine: jest.fn().mockResolvedValue(undefined),
      deleteByOrderId: jest.fn().mockResolvedValue(undefined),
      findOneByIdTenant: jest.fn().mockResolvedValue(null),
      updateQtyBilled: jest.fn().mockResolvedValue(undefined),
    };

    partnersRepository = {
      findOneById: jest.fn().mockResolvedValue({
        id: 'partner-001',
        nameEn: 'Supplier Co',
        isSupplier: true,
        isCustomer: false,
      }),
    };

    auditService = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logStatusChange: jest.fn().mockResolvedValue(undefined),
    };

    statusTransitionService = {
      registerTransitions: jest.fn(),
      validateOrThrow: jest.fn(),
    };

    outboxService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    sequencesService = {
      nextNumber: jest.fn().mockResolvedValue('PO-00001'),
    };

    currencyService = {
      getBaseCurrency: jest.fn().mockResolvedValue({ id: 'currency-sar', code: 'SAR' }),
      getRate: jest.fn().mockResolvedValue(3.75),
      convert: jest
        .fn()
        .mockImplementation(
          (amount: number, rate: number) => Math.round(amount * rate * 100) / 100,
        ),
    };

    receiptsService = {
      create: jest.fn().mockResolvedValue({ id: 'receipt-001' }),
    };

    invoicesService = {
      create: jest.fn().mockResolvedValue({ id: 'bill-001' }),
    };

    service = new PurchaseOrdersService(
      purchaseOrdersRepository as any,
      purchaseOrderLinesRepository as any,
      partnersRepository as any,
      auditService as any,
      statusTransitionService as any,
      outboxService as any,
      sequencesService as any,
      currencyService as any,
      receiptsService as any,
      invoicesService as any,
    );
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated results', async () => {
      purchaseOrdersRepository.findAllPaginated.mockResolvedValue({
        rows: [makeDraftPO()],
        total: 1,
      });

      const result = await service.findAll(tenantId, {} as any);
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should use custom pagination parameters', async () => {
      await service.findAll(tenantId, { page: 3, limit: 5, search: 'PO-' } as any);

      expect(purchaseOrdersRepository.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 5,
        offset: 10,
        search: 'PO-',
        sortOrder: 'DESC',
      });
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return PO with lines', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      const result = await service.findById(tenantId, 'po-001');
      expect(result.id).toBe('po-001');
      expect(result.lines).toHaveLength(1);
    });

    it('should throw BadRequestException when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a draft PO with lines', async () => {
      const result = await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(purchaseOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          status: PurchaseOrderStatus.DRAFT,
          billStatus: PurchaseOrderBillStatus.NOTHING,
          receiptStatus: PurchaseOrderReceiptStatus.NOTHING,
        }),
      );
      expect(purchaseOrderLinesRepository.insertLine).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should generate sequence number', async () => {
      await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(sequencesService.nextNumber).toHaveBeenCalledWith(
        tenantId,
        'purchase_order',
        'branch-001',
      );
    });

    it('should validate partner is a supplier', async () => {
      partnersRepository.findOneById.mockResolvedValue({
        id: 'partner-001',
        nameEn: 'Customer Co',
        isSupplier: false,
        isCustomer: true,
      });

      await expect(
        service.create(tenantId, makeCreateDto() as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when partner does not exist', async () => {
      partnersRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.create(tenantId, makeCreateDto() as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate line totals correctly: qty * unitPrice - discount + tax', async () => {
      const dto = makeCreateDto({
        lines: [
          {
            productId: 'p1',
            quantity: 10,
            unitPrice: 100,
            discountAmount: 50,
            taxRate: 15,
            description: 'Item',
          },
        ],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = purchaseOrdersRepository.insertOrder.mock.calls[0][1];
      // lineSubtotal = 10 * 100 = 1000
      // lineDiscount = 50
      // taxable = 1000 - 50 = 950
      // tax = 950 * 15/100 = 142.5
      // lineTotal = 1000 - 50 + 142.5 = 1092.5
      expect(insertCall.subtotal).toBe(1000);
      expect(insertCall.taxAmount).toBe(142.5);
    });

    it('should handle zero tax rate', async () => {
      const dto = makeCreateDto({
        lines: [
          {
            productId: 'p1',
            quantity: 5,
            unitPrice: 100,
            description: 'Zero tax',
          },
        ],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = purchaseOrdersRepository.insertOrder.mock.calls[0][1];
      expect(insertCall.taxAmount).toBe(0);
      expect(insertCall.subtotal).toBe(500);
      expect(insertCall.totalAmount).toBe(500);
    });

    it('should handle multiple lines', async () => {
      const dto = makeCreateDto({
        lines: [
          { productId: 'p1', quantity: 2, unitPrice: 100, description: 'A' },
          { productId: 'p2', quantity: 3, unitPrice: 200, description: 'B' },
        ],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      expect(purchaseOrderLinesRepository.insertLine).toHaveBeenCalledTimes(2);
      const insertCall = purchaseOrdersRepository.insertOrder.mock.calls[0][1];
      // subtotal = (2*100) + (3*200) = 200 + 600 = 800
      expect(insertCall.subtotal).toBe(800);
    });

    it('should log audit create event', async () => {
      await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(auditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'purchasing.orders',
        'po-001',
        expect.any(Object),
        'user-001',
      );
    });

    it('should combine order-level and line-level discounts', async () => {
      const dto = makeCreateDto({
        discountAmount: 25,
        lines: [
          {
            productId: 'p1',
            quantity: 10,
            unitPrice: 100,
            discountAmount: 50,
            description: 'Item',
          },
        ],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = purchaseOrdersRepository.insertOrder.mock.calls[0][1];
      // totalDiscount = orderDiscount(25) + lineDiscount(50) = 75
      expect(insertCall.discountAmount).toBe(75);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update a draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      const result = await service.update(
        tenantId,
        'po-001',
        { version: 0, notes: 'updated' } as any,
        auditContext as any,
      );

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw when updating non-draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());

      await expect(
        service.update(tenantId, 'po-001', { version: 0 } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO({ version: 3 }));

      await expect(
        service.update(tenantId, 'po-001', { version: 1 } as any, auditContext as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'nonexistent', { version: 0 } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate supplier when partnerId changes', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());
      partnersRepository.findOneById.mockResolvedValueOnce(makeDraftPO()); // existing lookup
      partnersRepository.findOneById.mockResolvedValue({
        id: 'partner-002',
        isSupplier: false,
      });

      await expect(
        service.update(
          tenantId,
          'po-001',
          { version: 0, partnerId: 'partner-002' } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should replace lines and recalculate totals when lines provided', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.update(
        tenantId,
        'po-001',
        {
          version: 0,
          lines: [{ productId: 'p1', quantity: 20, unitPrice: 30, description: 'New' }],
        } as any,
        auditContext as any,
      );

      expect(purchaseOrderLinesRepository.deleteByOrderId).toHaveBeenCalledTimes(1);
      expect(purchaseOrderLinesRepository.insertLine).toHaveBeenCalledTimes(1);
    });

    it('should log audit update event', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.update(
        tenantId,
        'po-001',
        { version: 0, notes: 'updated' } as any,
        auditContext as any,
      );

      expect(auditService.logUpdate).toHaveBeenCalledWith(
        tenantId,
        'purchasing.orders',
        'po-001',
        expect.any(Object),
        expect.any(Object),
        'user-001',
      );
    });
  });

  // ─── confirm ───────────────────────────────────────────────────────────────

  describe('confirm()', () => {
    it('should confirm a draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      const result = await service.confirm(tenantId, 'po-001', auditContext as any);

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: PurchaseOrderStatus.CONFIRMED }),
      );
      expect(result).toBeDefined();
    });

    it('should lock exchange rate on confirm', async () => {
      const po = makeDraftPO({ currencyId: 'currency-usd' });
      purchaseOrdersRepository.findOneById.mockResolvedValue(po);
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.confirm(tenantId, 'po-001', auditContext as any);

      expect(currencyService.getRate).toHaveBeenCalledWith(
        tenantId,
        'currency-usd',
        'currency-sar',
      );
      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['"exchangeRate" = :exchangeRate']),
        expect.objectContaining({ exchangeRate: 3.75 }),
      );
    });

    it('should throw when confirming already confirmed PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Invalid transition');
      });

      await expect(service.confirm(tenantId, 'po-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(service.confirm(tenantId, 'nonexistent', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log audit status change', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.confirm(tenantId, 'po-001', auditContext as any);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'purchasing.orders',
        'po-001',
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.CONFIRMED,
        'user-001',
      );
    });

    it('should set exchangeRate=1 for base currency', async () => {
      const po = makeDraftPO({ currencyId: 'currency-sar' });
      purchaseOrdersRepository.findOneById.mockResolvedValue(po);
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.confirm(tenantId, 'po-001', auditContext as any);

      expect(currencyService.getRate).not.toHaveBeenCalled();
      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['"exchangeRate" = :exchangeRate']),
        expect.objectContaining({ exchangeRate: 1 }),
      );
    });

    it('should create outbox event when delivery is due within 1 day', async () => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 12);

      const po = makeDraftPO({ expectedDeliveryDate: tomorrow.toISOString() });
      purchaseOrdersRepository.findOneById.mockResolvedValue(po);
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.confirm(tenantId, 'po-001', auditContext as any);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        mockTransaction,
        tenantId,
        'purchase_order_due',
        expect.objectContaining({ orderId: 'po-001' }),
        'po-001',
        'purchase_order',
      );
    });

    it('should NOT create outbox event when delivery is far in the future', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);

      const po = makeDraftPO({ expectedDeliveryDate: future.toISOString() });
      purchaseOrdersRepository.findOneById.mockResolvedValue(po);
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.confirm(tenantId, 'po-001', auditContext as any);

      expect(outboxService.createEvent).not.toHaveBeenCalled();
    });

    it('should update line-level base amounts for foreign currency', async () => {
      const po = makeDraftPO({ currencyId: 'currency-usd' });
      purchaseOrdersRepository.findOneById.mockResolvedValue(po);
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());
      const mockSequelize = purchaseOrdersRepository.getSequelize();

      await service.confirm(tenantId, 'po-001', auditContext as any);

      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE purchase_order_lines'),
        expect.any(Object),
      );
    });
  });

  // ─── createReceipt ────────────────────────────────────────────────────────

  describe('createReceipt()', () => {
    it('should create receipt from confirmed PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      const result = await service.createReceipt(
        tenantId,
        'po-001',
        { scheduledDate: '2026-04-01' } as any,
        auditContext as any,
      );

      expect(receiptsService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          purchaseOrderId: 'po-001',
          partnerId: 'partner-001',
        }),
        auditContext,
      );
      expect(result.id).toBe('receipt-001');
    });

    it('should throw when creating receipt from draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());

      await expect(
        service.createReceipt(tenantId, 'po-001', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when creating receipt from cancelled PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(
        makeDraftPO({ status: PurchaseOrderStatus.CANCELLED }),
      );

      await expect(
        service.createReceipt(tenantId, 'po-001', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow receipt creation from done PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(
        makeConfirmedPO({ status: PurchaseOrderStatus.DONE }),
      );
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      const result = await service.createReceipt(
        tenantId,
        'po-001',
        {} as any,
        auditContext as any,
      );

      expect(result.id).toBe('receipt-001');
    });

    it('should throw when all lines are fully received', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(
        makePOLines([{ receivedQuantity: '10' }]),
      );

      await expect(
        service.createReceipt(tenantId, 'po-001', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only include lines with remaining qty to receive', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue([
        ...makePOLines([{ id: 'line-1', receivedQuantity: '10', quantity: '10' }]),
        ...makePOLines([{ id: 'line-2', receivedQuantity: '3', quantity: '10' }]),
      ]);

      await service.createReceipt(tenantId, 'po-001', {} as any, auditContext as any);

      const createCall = receiptsService.create.mock.calls[0][1];
      expect(createCall.lines).toHaveLength(1);
      expect(createCall.lines[0].qtyDemand).toBe(7);
    });

    it('should update receiptStatus to PARTIAL when first receipt created', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(
        makeConfirmedPO({ receiptStatus: PurchaseOrderReceiptStatus.NOTHING }),
      );
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.createReceipt(tenantId, 'po-001', {} as any, auditContext as any);

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['"receiptStatus" = :receiptStatus']),
        expect.objectContaining({
          receiptStatus: PurchaseOrderReceiptStatus.PARTIAL,
        }),
      );
    });

    it('should NOT update receiptStatus if already partial', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(
        makeConfirmedPO({ receiptStatus: PurchaseOrderReceiptStatus.PARTIAL }),
      );
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.createReceipt(tenantId, 'po-001', {} as any, auditContext as any);

      const receiptStatusCalls = purchaseOrdersRepository.updateOrder.mock.calls.filter(
        (call: unknown[]) => {
          const replacements = call[3] as Record<string, unknown>;
          return replacements?.receiptStatus !== undefined;
        },
      );
      expect(receiptStatusCalls).toHaveLength(0);
    });

    it('should throw when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.createReceipt(tenantId, 'nonexistent', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── createBill ────────────────────────────────────────────────────────────

  describe('createBill()', () => {
    it('should create bill from confirmed PO', async () => {
      purchaseOrdersRepository.findOneById
        .mockResolvedValueOnce(makeConfirmedPO()) // first call in createBill
        .mockResolvedValueOnce(makeConfirmedPO()) // call in checkAndMarkDone
        .mockResolvedValue(makeConfirmedPO()); // call in findById at end

      purchaseOrderLinesRepository.findByOrderIdTenant
        .mockResolvedValueOnce(makePOLines()) // filter lines
        .mockResolvedValueOnce(makePOLines([{ qtyBilled: '10' }])) // after update, check all billed
        .mockResolvedValue(makePOLines()); // findById call

      const result = await service.createBill(
        tenantId,
        'po-001',
        { invoiceDate: '2026-04-01' } as any,
        auditContext as any,
      );

      expect(invoicesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          purchaseOrderId: 'po-001',
          invoiceType: 'in_invoice',
        }),
        auditContext,
      );
      expect((result as any).id).toBe('bill-001');
    });

    it('should throw when creating bill from draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());

      await expect(
        service.createBill(tenantId, 'po-001', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when all lines are fully billed', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(
        makePOLines([{ qtyBilled: '10' }]),
      );

      await expect(
        service.createBill(tenantId, 'po-001', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update qtyBilled on PO lines after creating bill', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant
        .mockResolvedValueOnce(makePOLines()) // initial check
        .mockResolvedValueOnce(makePOLines([{ qtyBilled: '10' }])) // after billed
        .mockResolvedValue(makePOLines());

      await service.createBill(
        tenantId,
        'po-001',
        { invoiceDate: '2026-04-01' } as any,
        auditContext as any,
      );

      expect(purchaseOrderLinesRepository.updateQtyBilled).toHaveBeenCalledTimes(1);
    });

    it('should set billStatus=BILLED when all lines fully billed', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant
        .mockResolvedValueOnce(makePOLines()) // initial
        .mockResolvedValueOnce(makePOLines([{ qtyBilled: '10', quantity: '10' }])) // fully billed
        .mockResolvedValue(makePOLines());

      await service.createBill(
        tenantId,
        'po-001',
        { invoiceDate: '2026-04-01' } as any,
        auditContext as any,
      );

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['"billStatus" = :billStatus']),
        expect.objectContaining({
          billStatus: PurchaseOrderBillStatus.BILLED,
        }),
      );
    });

    it('should set billStatus=TO_BILL when some lines not fully billed', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant
        .mockResolvedValueOnce(makePOLines()) // initial
        .mockResolvedValueOnce(makePOLines([{ qtyBilled: '5', quantity: '10' }])) // partially billed
        .mockResolvedValue(makePOLines());

      await service.createBill(
        tenantId,
        'po-001',
        { invoiceDate: '2026-04-01' } as any,
        auditContext as any,
      );

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['"billStatus" = :billStatus']),
        expect.objectContaining({
          billStatus: PurchaseOrderBillStatus.TO_BILL,
        }),
      );
    });

    it('should throw when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.createBill(tenantId, 'nonexistent', {} as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── cancel ────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      const result = await service.cancel(tenantId, 'po-001', auditContext as any);

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: PurchaseOrderStatus.CANCELLED }),
      );
      expect(result).toBeDefined();
    });

    it('should cancel a confirmed PO with no receipts or bills', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.cancel(tenantId, 'po-001', auditContext as any);

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalled();
    });

    it('should throw when cancelling PO with existing receipts', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(
        makeConfirmedPO({ receiptStatus: PurchaseOrderReceiptStatus.PARTIAL }),
      );

      await expect(service.cancel(tenantId, 'po-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when cancelling PO with existing bills', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(
        makeConfirmedPO({ billStatus: PurchaseOrderBillStatus.TO_BILL }),
      );

      await expect(service.cancel(tenantId, 'po-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when cancelling a done PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(
        makeDraftPO({ status: PurchaseOrderStatus.DONE }),
      );
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Invalid transition');
      });

      await expect(service.cancel(tenantId, 'po-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log audit status change on cancel', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.cancel(tenantId, 'po-001', auditContext as any);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'purchasing.orders',
        'po-001',
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.CANCELLED,
        'user-001',
      );
    });

    it('should throw when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(service.cancel(tenantId, 'nonexistent', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Auto-done detection ──────────────────────────────────────────────────

  describe('auto-done detection', () => {
    it('should mark PO as done when fully received AND fully billed', async () => {
      const po = makeConfirmedPO({
        receiptStatus: PurchaseOrderReceiptStatus.RECEIVED,
        billStatus: PurchaseOrderBillStatus.NOTHING,
      });
      purchaseOrdersRepository.findOneById
        .mockResolvedValueOnce(po) // createBill initial
        .mockResolvedValueOnce(
          makeConfirmedPO({
            receiptStatus: PurchaseOrderReceiptStatus.RECEIVED,
            billStatus: PurchaseOrderBillStatus.BILLED,
          }),
        ) // checkAndMarkDone
        .mockResolvedValue(po); // findById at end

      purchaseOrderLinesRepository.findByOrderIdTenant
        .mockResolvedValueOnce(makePOLines()) // initial filter
        .mockResolvedValueOnce(makePOLines([{ qtyBilled: '10', quantity: '10' }])) // all billed
        .mockResolvedValue(makePOLines());

      await service.createBill(
        tenantId,
        'po-001',
        { invoiceDate: '2026-04-01' } as any,
        auditContext as any,
      );

      expect(purchaseOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: PurchaseOrderStatus.DONE }),
      );
    });

    it('should NOT mark as done when only billed but not received', async () => {
      const po = makeConfirmedPO({
        receiptStatus: PurchaseOrderReceiptStatus.NOTHING,
        billStatus: PurchaseOrderBillStatus.NOTHING,
      });
      purchaseOrdersRepository.findOneById
        .mockResolvedValueOnce(po)
        .mockResolvedValueOnce(
          makeConfirmedPO({
            receiptStatus: PurchaseOrderReceiptStatus.NOTHING,
            billStatus: PurchaseOrderBillStatus.BILLED,
          }),
        )
        .mockResolvedValue(po);

      purchaseOrderLinesRepository.findByOrderIdTenant
        .mockResolvedValueOnce(makePOLines())
        .mockResolvedValueOnce(makePOLines([{ qtyBilled: '10', quantity: '10' }]))
        .mockResolvedValue(makePOLines());

      await service.createBill(
        tenantId,
        'po-001',
        { invoiceDate: '2026-04-01' } as any,
        auditContext as any,
      );

      const doneUpdateCalls = purchaseOrdersRepository.updateOrder.mock.calls.filter(
        (call: unknown[]) => {
          const replacements = call[3] as Record<string, unknown>;
          return replacements?.status === PurchaseOrderStatus.DONE;
        },
      );
      expect(doneUpdateCalls).toHaveLength(0);
    });

    it('should NOT mark as done when already done', async () => {
      const donePO = makeConfirmedPO({
        status: PurchaseOrderStatus.DONE,
        receiptStatus: PurchaseOrderReceiptStatus.RECEIVED,
        billStatus: PurchaseOrderBillStatus.BILLED,
      });
      purchaseOrdersRepository.findOneById.mockResolvedValue(donePO);
      purchaseOrderLinesRepository.findByOrderIdTenant
        .mockResolvedValueOnce(makePOLines())
        .mockResolvedValueOnce(makePOLines([{ qtyBilled: '10', quantity: '10' }]))
        .mockResolvedValue(makePOLines());

      await service.createBill(
        tenantId,
        'po-001',
        { invoiceDate: '2026-04-01' } as any,
        auditContext as any,
      );

      // checkAndMarkDone should return early — no DONE status update
      const doneUpdateCalls = purchaseOrdersRepository.updateOrder.mock.calls.filter(
        (call: unknown[]) => {
          const replacements = call[3] as Record<string, unknown>;
          return replacements?.status === PurchaseOrderStatus.DONE;
        },
      );
      expect(doneUpdateCalls).toHaveLength(0);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft-delete a draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());

      await service.remove(tenantId, 'po-001', auditContext as any);

      expect(purchaseOrdersRepository.softDeleteOrder).toHaveBeenCalledWith(
        tenantId,
        'po-001',
        'user-001',
      );
    });

    it('should throw when deleting non-draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());

      await expect(service.remove(tenantId, 'po-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log audit delete event', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());

      await service.remove(tenantId, 'po-001', auditContext as any);

      expect(auditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'purchasing.orders',
        'po-001',
        expect.any(Object),
        'user-001',
      );
    });
  });

  // ─── Line management ──────────────────────────────────────────────────────

  describe('addLine()', () => {
    it('should add a line to a draft PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      const result = await service.addLine(
        tenantId,
        'po-001',
        { productId: 'p2', quantity: 5, unitPrice: 30, description: 'New' } as any,
        auditContext as any,
      );

      expect(purchaseOrderLinesRepository.insertLine).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw when adding line to confirmed PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());

      await expect(
        service.addLine(
          tenantId,
          'po-001',
          { productId: 'p1', quantity: 1, unitPrice: 10 } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate tax after discount on new line', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findByOrderIdTenant.mockResolvedValue(makePOLines());

      await service.addLine(
        tenantId,
        'po-001',
        {
          productId: 'p1',
          quantity: 10,
          unitPrice: 100,
          discountAmount: 100,
          taxRate: 15,
        } as any,
        auditContext as any,
      );

      const insertCall = purchaseOrderLinesRepository.insertLine.mock.calls[0][1];
      // lineSubtotal = 10 * 100 = 1000, discount = 100, taxable = 900
      // tax = 900 * 15/100 = 135
      expect(insertCall.taxAmount).toBe(135);
      expect(insertCall.lineTotal).toBe(1000 - 100 + 135);
    });
  });

  describe('removeLine()', () => {
    it('should throw when removing line from confirmed PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeConfirmedPO());

      await expect(
        service.removeLine(tenantId, 'po-001', 'line-1', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when PO does not exist', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.removeLine(tenantId, 'nonexistent', 'line-1', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when line does not belong to PO', async () => {
      purchaseOrdersRepository.findOneById.mockResolvedValue(makeDraftPO());
      purchaseOrderLinesRepository.findOneByIdTenant.mockResolvedValue({
        id: 'line-1',
        orderId: 'different-order',
      });

      await expect(
        service.removeLine(tenantId, 'po-001', 'line-1', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
