jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

// Mock transitive dependencies that have pre-existing TS issues
jest.mock('@/modules/fiscal-positions/services/fiscal-positions.service', () => ({
  FiscalPositionsService: jest.fn(),
}));
jest.mock('@/modules/pricelists/services/pricelists.service', () => ({
  PricelistsService: jest.fn(),
}));
jest.mock('@/modules/down-payments/services/down-payments.service', () => ({
  DownPaymentsService: jest.fn(),
}));
jest.mock('@/modules/invoices/services/invoices.service', () => ({
  InvoicesService: jest.fn(),
}));
jest.mock('@/modules/deliveries/services/deliveries.service', () => ({
  DeliveriesService: jest.fn(),
}));

import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import {
  SalesOrderStatus,
  SalesOrderInvoiceStatus,
  SalesOrderDeliveryStatus,
  SalesDiscountType,
} from '@/common/enums/crm.enums';
import { ProductType } from '@/common/enums/pos.enums';
import { CreateInvoiceType } from '../dto/create-invoice-from-so.dto';

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;
  let salesOrdersRepository: Record<string, jest.Mock>;
  let salesOrderLinesRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let partnersRepository: Record<string, jest.Mock>;
  let warehousesRepository: Record<string, jest.Mock>;
  let statusTransitionService: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let inventoryService: Record<string, jest.Mock>;
  let invoicesService: Record<string, jest.Mock>;
  let deliveriesService: Record<string, jest.Mock>;
  let pricelistsService: Record<string, jest.Mock>;
  let fiscalPositionsService: Record<string, jest.Mock>;
  let downPaymentsService: Record<string, jest.Mock>;
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
        unitPrice: 100,
        description: 'Widget',
      },
    ],
    ...overrides,
  });

  const makeDraftOrder = (overrides: Record<string, unknown> = {}) => ({
    id: 'order-001',
    orderNumber: 'SO-00001',
    partnerId: 'partner-001',
    branchId: 'branch-001',
    status: SalesOrderStatus.DRAFT,
    invoiceStatus: SalesOrderInvoiceStatus.NOTHING,
    deliveryStatus: SalesOrderDeliveryStatus.PENDING,
    subtotal: '1000',
    discountAmount: '0',
    taxAmount: '150',
    totalAmount: '1150',
    totalAmountBase: '1150',
    currencyId: 'currency-sar',
    exchangeRate: '1',
    pricelistId: null,
    fiscalPositionId: null,
    discountType: null,
    discountValue: null,
    version: 0,
    lines: [
      {
        id: 'line-001',
        orderId: 'order-001',
        productId: 'product-001',
        productVariantId: null,
        description: 'Widget',
        quantity: '10',
        unitPrice: '100',
        discountPct: '0',
        discountAmount: '0',
        taxRate: '15',
        taxAmount: '150',
        lineTotal: '1150',
        lineTotalBase: '1150',
        qtyDelivered: '0',
        version: 0,
      },
    ],
    ...overrides,
  });

  const makeConfirmedOrder = (overrides: Record<string, unknown> = {}) =>
    makeDraftOrder({
      status: SalesOrderStatus.CONFIRMED,
      invoiceStatus: SalesOrderInvoiceStatus.TO_INVOICE,
      ...overrides,
    });

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    const mockSequelize = {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
      query: jest.fn(),
    };

    salesOrdersRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findOneById: jest.fn().mockResolvedValue(makeDraftOrder()),
      insertOrder: jest.fn().mockResolvedValue(undefined),
      updateOrder: jest.fn().mockResolvedValue(undefined),
      softDeleteOrder: jest.fn().mockResolvedValue(undefined),
      getSequelizeInstance: jest.fn().mockResolvedValue(mockSequelize),
      hasLinkedInvoices: jest.fn().mockResolvedValue(false),
      hasLinkedDeliveries: jest.fn().mockResolvedValue(false),
      countLinkedInvoices: jest.fn().mockResolvedValue({ total: 0 }),
      countLinkedDeliveries: jest.fn().mockResolvedValue({ total: 0, done: 0 }),
      getSalesReportSummary: jest.fn().mockResolvedValue({}),
    };

    salesOrderLinesRepository = {
      findLinesByOrderId: jest.fn().mockResolvedValue([]),
      insertLine: jest.fn().mockResolvedValue(undefined),
      updateLine: jest.fn().mockResolvedValue(undefined),
      deleteByOrderId: jest.fn().mockResolvedValue(undefined),
      softDeleteLine: jest.fn().mockResolvedValue(undefined),
      findLineById: jest.fn().mockResolvedValue(null),
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

    partnersRepository = {
      findOneById: jest.fn().mockResolvedValue({
        id: 'partner-001',
        nameEn: 'Acme Corp',
        isCustomer: true,
        isSupplier: false,
        pricelistId: null,
        paymentTermId: null,
        fiscalPositionId: null,
      }),
    };

    warehousesRepository = {
      findDefault: jest.fn().mockResolvedValue({ id: 'warehouse-001' }),
    };

    statusTransitionService = {
      registerTransitions: jest.fn(),
      validateOrThrow: jest.fn(),
    };

    outboxService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    auditService = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logStatusChange: jest.fn().mockResolvedValue(undefined),
    };

    sequencesService = {
      nextNumber: jest.fn().mockResolvedValue('SO-00001'),
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

    inventoryService = {
      getStockLevel: jest.fn().mockResolvedValue([{ quantity: '100', reservedQuantity: '0' }]),
      reserveStock: jest.fn().mockResolvedValue(undefined),
      releaseReservation: jest.fn().mockResolvedValue(undefined),
    };

    invoicesService = {
      create: jest.fn().mockResolvedValue({ id: 'invoice-001', invoiceNumber: 'INV-00001' }),
    };

    deliveriesService = {
      create: jest.fn().mockResolvedValue({ id: 'delivery-001' }),
    };

    pricelistsService = {
      computePrice: jest.fn().mockResolvedValue({
        computedPrice: 100,
        originalPrice: 100,
        discount: 0,
      }),
    };

    fiscalPositionsService = {};

    downPaymentsService = {
      create: jest.fn().mockResolvedValue({ id: 'dp-001' }),
    };

    service = new SalesOrdersService(
      salesOrdersRepository as any,
      salesOrderLinesRepository as any,
      productsRepository as any,
      partnersRepository as any,
      warehousesRepository as any,
      statusTransitionService as any,
      outboxService as any,
      auditService as any,
      sequencesService as any,
      currencyService as any,
      inventoryService as any,
      invoicesService as any,
      deliveriesService as any,
      pricelistsService as any,
      fiscalPositionsService as any,
      downPaymentsService as any,
    );
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated results with default limit', async () => {
      salesOrdersRepository.findAllPaginated.mockResolvedValue({
        rows: [makeDraftOrder()],
        total: 1,
      });

      const result = await service.findAll(tenantId, {} as any);
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
    });

    it('should pass search and sort parameters through', async () => {
      await service.findAll(tenantId, {
        search: 'SO-',
        sortOrder: 'ASC',
        page: 2,
        limit: 10,
      } as any);

      expect(salesOrdersRepository.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 10,
        offset: 10,
        search: 'SO-',
        sortOrder: 'ASC',
      });
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return order with lines', async () => {
      const order = makeDraftOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);

      const result = await service.findById(tenantId, 'order-001');
      expect(result.id).toBe('order-001');
      expect(result.lines).toHaveLength(1);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    beforeEach(() => {
      // After create, findById is called — set up the chain
      const createdOrder = makeDraftOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(createdOrder);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(createdOrder.lines);
    });

    it('should create a draft SO with lines and return it', async () => {
      const dto = makeCreateDto();
      const result = await service.create(tenantId, dto as any, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledTimes(1);
      expect(salesOrderLinesRepository.insertLine).toHaveBeenCalledTimes(1);
      expect(result.orderNumber).toBe('SO-00001');
    });

    it('should generate a sequence number', async () => {
      await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(sequencesService.nextNumber).toHaveBeenCalledWith(
        tenantId,
        expect.any(String),
        'branch-001',
      );
    });

    it('should validate partner exists', async () => {
      partnersRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.create(tenantId, makeCreateDto() as any, auditContext as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use tenant base currency when no currencyId provided', async () => {
      await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(currencyService.getBaseCurrency).toHaveBeenCalledWith(tenantId);
      const insertCall = salesOrdersRepository.insertOrder.mock.calls[0][1];
      expect(insertCall.currencyId).toBe('currency-sar');
    });

    it('should use provided currencyId when specified', async () => {
      const dto = makeCreateDto({ currencyId: 'currency-usd' });
      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = salesOrdersRepository.insertOrder.mock.calls[0][1];
      expect(insertCall.currencyId).toBe('currency-usd');
    });

    it('should store partnerId (not contactId)', async () => {
      const dto = makeCreateDto({ partnerId: 'partner-xyz' });
      partnersRepository.findOneById.mockResolvedValue({
        id: 'partner-xyz',
        nameEn: 'Test',
        pricelistId: null,
        paymentTermId: null,
        fiscalPositionId: null,
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = salesOrdersRepository.insertOrder.mock.calls[0][1];
      expect(insertCall.partnerId).toBe('partner-xyz');
    });

    it('should calculate line totals: qty * unitPrice', async () => {
      const dto = makeCreateDto({
        lines: [{ productId: 'p1', quantity: 5, unitPrice: 200, description: 'Item' }],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = salesOrdersRepository.insertOrder.mock.calls[0][1];
      // subtotal = 5 * 200 = 1000
      expect(insertCall.subtotal).toBe(1000);
    });

    it('should calculate tax after discount: tax = (subtotal - discount) * taxRate / 100', async () => {
      const dto = makeCreateDto({
        lines: [
          {
            productId: 'p1',
            quantity: 10,
            unitPrice: 100,
            discountPct: 10,
            taxRate: 15,
            description: 'Discounted',
          },
        ],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = salesOrdersRepository.insertOrder.mock.calls[0][1];
      // lineSubtotal = 10 * 100 = 1000
      // discount = 1000 * 10 / 100 = 100
      // taxable = 1000 - 100 = 900
      // tax = 900 * 15 / 100 = 135
      expect(insertCall.taxAmount).toBe(135);
      expect(insertCall.discountAmount).toBe(100);
    });

    it('should create multiple lines', async () => {
      const dto = makeCreateDto({
        lines: [
          { productId: 'p1', quantity: 2, unitPrice: 50, description: 'A' },
          { productId: 'p2', quantity: 3, unitPrice: 100, description: 'B' },
        ],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      expect(salesOrderLinesRepository.insertLine).toHaveBeenCalledTimes(2);
    });

    it('should write outbox event on creation', async () => {
      await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'sales_order.created' }),
      );
    });

    it('should commit transaction on success', async () => {
      await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      salesOrdersRepository.insertOrder.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create(tenantId, makeCreateDto() as any, auditContext as any),
      ).rejects.toThrow('DB error');

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should log audit create event', async () => {
      await service.create(tenantId, makeCreateDto() as any, auditContext as any);

      expect(auditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'sales_orders',
        expect.any(String),
        expect.any(Object),
        'user-001',
      );
    });

    it('should apply order-level percentage discount', async () => {
      const dto = makeCreateDto({
        discountType: SalesDiscountType.PERCENTAGE,
        discountValue: 10,
        lines: [{ productId: 'p1', quantity: 10, unitPrice: 100, description: 'Item' }],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = salesOrdersRepository.insertOrder.mock.calls[0][1];
      // subtotal = 1000, order discount = 1000 * 10 / 100 = 100
      // totalDiscount = 100 (order-level)
      expect(insertCall.discountAmount).toBe(100);
    });

    it('should apply order-level fixed discount', async () => {
      const dto = makeCreateDto({
        discountType: SalesDiscountType.FIXED,
        discountValue: 50,
        lines: [{ productId: 'p1', quantity: 10, unitPrice: 100, description: 'Item' }],
      });

      await service.create(tenantId, dto as any, auditContext as any);

      const insertCall = salesOrdersRepository.insertOrder.mock.calls[0][1];
      expect(insertCall.discountAmount).toBe(50);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should allow update of draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      const result = await service.update(
        tenantId,
        'order-001',
        { version: 0, notes: 'updated' } as any,
        auditContext as any,
      );

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when updating non-draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeConfirmedOrder());

      await expect(
        service.update(tenantId, 'order-001', { version: 0 } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder({ version: 5 }));

      await expect(
        service.update(tenantId, 'order-001', { version: 3 } as any, auditContext as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'non-existent', { version: 0 } as any, auditContext as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should replace lines and recalculate totals when lines provided', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      await service.update(
        tenantId,
        'order-001',
        {
          version: 0,
          lines: [{ productId: 'p1', quantity: 5, unitPrice: 200, description: 'Replaced' }],
        } as any,
        auditContext as any,
      );

      expect(salesOrderLinesRepository.deleteByOrderId).toHaveBeenCalledTimes(1);
      expect(salesOrderLinesRepository.insertLine).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error during update', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrdersRepository.updateOrder.mockRejectedValue(new Error('Update error'));

      await expect(
        service.update(
          tenantId,
          'order-001',
          { version: 0, notes: 'fail' } as any,
          auditContext as any,
        ),
      ).rejects.toThrow('Update error');

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });
  });

  // ─── confirm ───────────────────────────────────────────────────────────────

  describe('confirm()', () => {
    beforeEach(() => {
      const order = makeDraftOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
    });

    it('should confirm a draft SO and set status=confirmed', async () => {
      const result = await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: SalesOrderStatus.CONFIRMED }),
        mockTransaction,
      );
      expect(result).toBeDefined();
    });

    it('should lock exchange rate at confirmation', async () => {
      const order = makeDraftOrder({ currencyId: 'currency-usd' });
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);

      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(currencyService.getRate).toHaveBeenCalledWith(
        tenantId,
        'currency-usd',
        'currency-sar',
      );
      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"exchangeRate" = :exchangeRate']),
        expect.objectContaining({ exchangeRate: 3.75 }),
        mockTransaction,
      );
    });

    it('should reserve stock for storable products', async () => {
      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        tenantId,
        'product-001',
        'warehouse-001',
        10,
        mockTransaction,
      );
    });

    it('should not reserve stock for consumable products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        productType: ProductType.CONSUMABLE,
      });

      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(inventoryService.reserveStock).not.toHaveBeenCalled();
    });

    it('should not reserve stock for service products', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        productType: ProductType.SERVICE,
      });

      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(inventoryService.reserveStock).not.toHaveBeenCalled();
    });

    it('should throw when insufficient stock for storable product', async () => {
      inventoryService.getStockLevel.mockResolvedValue([{ quantity: '5', reservedQuantity: '0' }]);

      await expect(service.confirm(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when confirming already confirmed SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeConfirmedOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeConfirmedOrder().lines);
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Invalid transition');
      });

      await expect(service.confirm(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when SO has no lines', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder({ lines: [] }));
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue([]);

      await expect(service.confirm(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set invoiceStatus to TO_INVOICE on confirm', async () => {
      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"invoiceStatus" = :invoiceStatus']),
        expect.objectContaining({
          invoiceStatus: SalesOrderInvoiceStatus.TO_INVOICE,
        }),
        mockTransaction,
      );
    });

    it('should write outbox event on confirmation', async () => {
      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'sales_order.confirmed' }),
      );
    });

    it('should commit transaction on successful confirm', async () => {
      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on failed confirm', async () => {
      inventoryService.reserveStock.mockRejectedValue(new Error('Reserve failed'));

      await expect(service.confirm(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        'Reserve failed',
      );

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should log audit status change', async () => {
      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'sales_orders',
        'order-001',
        SalesOrderStatus.DRAFT,
        SalesOrderStatus.CONFIRMED,
        'user-001',
      );
    });

    it('should throw when no default warehouse configured', async () => {
      warehousesRepository.findDefault.mockResolvedValue(null);

      await expect(service.confirm(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update line base amounts for foreign currency', async () => {
      const order = makeDraftOrder({ currencyId: 'currency-usd' });
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);

      await service.confirm(tenantId, 'order-001', auditContext as any);

      expect(salesOrderLinesRepository.updateLine).toHaveBeenCalledWith(
        tenantId,
        'line-001',
        expect.arrayContaining(['"lineTotalBase" = :lineTotalBase']),
        expect.objectContaining({ currencyId: 'currency-usd' }),
        mockTransaction,
      );
    });
  });

  // ─── createInvoice ─────────────────────────────────────────────────────────

  describe('createInvoice()', () => {
    beforeEach(() => {
      const order = makeConfirmedOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
    });

    it('should create a regular invoice from confirmed SO', async () => {
      const result = await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.REGULAR } as any,
        auditContext as any,
      );

      expect(invoicesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          partnerId: 'partner-001',
          saleOrderId: 'order-001',
          invoiceType: 'out_invoice',
        }),
        auditContext,
      );
      expect((result as any).id).toBe('invoice-001');
    });

    it('should throw when creating invoice from draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      await expect(
        service.createInvoice(
          tenantId,
          'order-001',
          { type: CreateInvoiceType.REGULAR } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when creating invoice from cancelled SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(
        makeDraftOrder({ status: SalesOrderStatus.CANCELLED }),
      );
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue([]);

      await expect(
        service.createInvoice(
          tenantId,
          'order-001',
          { type: CreateInvoiceType.REGULAR } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow invoice creation from done SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(
        makeConfirmedOrder({ status: SalesOrderStatus.DONE }),
      );
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeConfirmedOrder().lines);

      const result = await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.REGULAR } as any,
        auditContext as any,
      );

      expect((result as any).id).toBe('invoice-001');
    });

    it('should create down payment invoice (percentage)', async () => {
      await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.DOWN_PAYMENT_PERCENTAGE, value: 30 } as any,
        auditContext as any,
      );

      expect(invoicesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: expect.arrayContaining([expect.objectContaining({ quantity: 1 })]),
        }),
        auditContext,
      );
      expect(downPaymentsService.create).toHaveBeenCalledTimes(1);
    });

    it('should create down payment invoice (fixed)', async () => {
      await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.DOWN_PAYMENT_FIXED, value: 200 } as any,
        auditContext as any,
      );

      expect(invoicesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: [expect.objectContaining({ unitPrice: 200, quantity: 1 })],
        }),
        auditContext,
      );
    });

    it('should throw when down payment percentage is out of range', async () => {
      await expect(
        service.createInvoice(
          tenantId,
          'order-001',
          { type: CreateInvoiceType.DOWN_PAYMENT_PERCENTAGE, value: 150 } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when down payment fixed exceeds order total', async () => {
      await expect(
        service.createInvoice(
          tenantId,
          'order-001',
          { type: CreateInvoiceType.DOWN_PAYMENT_FIXED, value: 99999 } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for unknown invoice type', async () => {
      await expect(
        service.createInvoice(
          tenantId,
          'order-001',
          { type: 'unknown_type' } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refresh invoice status after creating invoice', async () => {
      salesOrdersRepository.countLinkedInvoices.mockResolvedValue({ total: 1 });

      await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.REGULAR } as any,
        auditContext as any,
      );

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"invoiceStatus" = :invoiceStatus']),
        expect.objectContaining({
          invoiceStatus: SalesOrderInvoiceStatus.INVOICED,
        }),
      );
    });
  });

  // ─── createDelivery ────────────────────────────────────────────────────────

  describe('createDelivery()', () => {
    beforeEach(() => {
      const order = makeConfirmedOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
    });

    it('should create delivery from confirmed SO', async () => {
      const result = await service.createDelivery(tenantId, 'order-001', auditContext as any);

      expect(deliveriesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          saleOrderId: 'order-001',
          partnerId: 'partner-001',
        }),
        auditContext,
      );
      expect(result.id).toBe('delivery-001');
    });

    it('should throw when creating delivery from draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      await expect(
        service.createDelivery(tenantId, 'order-001', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when no lines remaining to deliver', async () => {
      const fullyDeliveredOrder = makeConfirmedOrder({
        lines: [
          {
            ...makeDraftOrder().lines[0],
            qtyDelivered: '10', // fully delivered
          },
        ],
      });
      salesOrdersRepository.findOneById.mockResolvedValue(fullyDeliveredOrder);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(fullyDeliveredOrder.lines);

      await expect(
        service.createDelivery(tenantId, 'order-001', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only include lines with remaining quantity', async () => {
      const order = makeConfirmedOrder({
        lines: [
          {
            id: 'line-001',
            productId: 'p1',
            quantity: '10',
            qtyDelivered: '10',
          },
          {
            id: 'line-002',
            productId: 'p2',
            quantity: '5',
            qtyDelivered: '2',
          },
        ],
      });
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);

      await service.createDelivery(tenantId, 'order-001', auditContext as any);

      const createCall = deliveriesService.create.mock.calls[0][1];
      expect(createCall.lines).toHaveLength(1);
      expect(createCall.lines[0].qtyDemand).toBe(3);
    });

    it('should refresh delivery status after creating delivery', async () => {
      salesOrdersRepository.countLinkedDeliveries.mockResolvedValue({
        total: 1,
        done: 0,
      });

      await service.createDelivery(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"deliveryStatus" = :deliveryStatus']),
        expect.objectContaining({
          deliveryStatus: SalesOrderDeliveryStatus.PARTIAL,
        }),
      );
    });
  });

  // ─── cancel ────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      const result = await service.cancel(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: SalesOrderStatus.CANCELLED }),
        mockTransaction,
      );
      expect(result).toBeDefined();
    });

    it('should cancel a confirmed SO and release stock reservations', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeConfirmedOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeConfirmedOrder().lines);

      await service.cancel(tenantId, 'order-001', auditContext as any);

      expect(inventoryService.releaseReservation).toHaveBeenCalledWith(
        tenantId,
        'product-001',
        'warehouse-001',
        10,
        mockTransaction,
      );
    });

    it('should not release stock for non-storable products on cancel', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeConfirmedOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeConfirmedOrder().lines);
      productsRepository.findById.mockResolvedValue({
        id: 'product-001',
        productType: ProductType.SERVICE,
      });

      await service.cancel(tenantId, 'order-001', auditContext as any);

      expect(inventoryService.releaseReservation).not.toHaveBeenCalled();
    });

    it('should throw when cancelling SO with linked invoices', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);
      salesOrdersRepository.hasLinkedInvoices.mockResolvedValue(true);

      await expect(service.cancel(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when cancelling SO with linked deliveries', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);
      salesOrdersRepository.hasLinkedDeliveries.mockResolvedValue(true);

      await expect(service.cancel(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when cancelling a done SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(
        makeDraftOrder({ status: SalesOrderStatus.DONE }),
      );
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue([]);
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Invalid transition');
      });

      await expect(service.cancel(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should write outbox event on cancellation', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      await service.cancel(tenantId, 'order-001', auditContext as any);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'sales_order.cancelled' }),
      );
    });

    it('should commit transaction on successful cancel', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      await service.cancel(tenantId, 'order-001', auditContext as any);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on cancel error', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);
      salesOrdersRepository.updateOrder.mockRejectedValue(new Error('Cancel failed'));

      await expect(service.cancel(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        'Cancel failed',
      );

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Auto-done detection ──────────────────────────────────────────────────

  describe('auto-done detection', () => {
    it('should mark SO as done when fully invoiced AND fully delivered', async () => {
      // After createInvoice, refreshInvoiceStatus calls checkAndMarkDone
      const order = makeConfirmedOrder({
        invoiceStatus: SalesOrderInvoiceStatus.INVOICED,
        deliveryStatus: SalesOrderDeliveryStatus.DONE,
      });
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedInvoices.mockResolvedValue({ total: 1 });

      await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.REGULAR } as any,
        auditContext as any,
      );

      // After refreshInvoiceStatus → checkAndMarkDone
      // The order at this point has invoiceStatus=INVOICED and deliveryStatus=DONE
      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: SalesOrderStatus.DONE }),
      );
    });

    it('should NOT mark as done when only invoiced but not delivered', async () => {
      const order = makeConfirmedOrder({
        invoiceStatus: SalesOrderInvoiceStatus.INVOICED,
        deliveryStatus: SalesOrderDeliveryStatus.PENDING,
      });
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedInvoices.mockResolvedValue({ total: 1 });

      await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.REGULAR } as any,
        auditContext as any,
      );

      // The final updateOrder for marking done should NOT have been called with DONE status
      const doneUpdateCalls = salesOrdersRepository.updateOrder.mock.calls.filter(
        (call: unknown[]) => {
          const replacements = call[3] as Record<string, unknown>;
          return replacements?.status === SalesOrderStatus.DONE;
        },
      );
      expect(doneUpdateCalls).toHaveLength(0);
    });

    it('should NOT mark as done when only delivered but not invoiced', async () => {
      const order = makeConfirmedOrder({
        invoiceStatus: SalesOrderInvoiceStatus.TO_INVOICE,
        deliveryStatus: SalesOrderDeliveryStatus.DONE,
      });
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedDeliveries.mockResolvedValue({
        total: 1,
        done: 1,
      });

      await service.createDelivery(tenantId, 'order-001', auditContext as any);

      const doneUpdateCalls = salesOrdersRepository.updateOrder.mock.calls.filter(
        (call: unknown[]) => {
          const replacements = call[3] as Record<string, unknown>;
          return replacements?.status === SalesOrderStatus.DONE;
        },
      );
      expect(doneUpdateCalls).toHaveLength(0);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft-delete a draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());

      await service.remove(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.softDeleteOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        'user-001',
      );
    });

    it('should throw when deleting non-draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeConfirmedOrder());

      await expect(service.remove(tenantId, 'order-001', auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when SO does not exist', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'non-existent', auditContext as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log audit delete event', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());

      await service.remove(tenantId, 'order-001', auditContext as any);

      expect(auditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'sales_orders',
        'order-001',
        expect.any(Object),
        'user-001',
      );
    });
  });

  // ─── Line management ──────────────────────────────────────────────────────

  describe('addLine()', () => {
    it('should add a line to a draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      const lineDto = {
        productId: 'product-002',
        quantity: 3,
        unitPrice: 50,
        description: 'New item',
      };

      const result = await service.addLine(
        tenantId,
        'order-001',
        lineDto as any,
        auditContext as any,
      );

      expect(salesOrderLinesRepository.insertLine).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw when adding line to non-draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeConfirmedOrder());

      await expect(
        service.addLine(
          tenantId,
          'order-001',
          { productId: 'p1', quantity: 1, unitPrice: 10 } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate order totals after adding line', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(makeDraftOrder().lines);

      await service.addLine(
        tenantId,
        'order-001',
        { productId: 'p1', quantity: 1, unitPrice: 100 } as any,
        auditContext as any,
      );

      // updateOrder should be called for totals recalculation
      expect(salesOrdersRepository.updateOrder).toHaveBeenCalled();
    });
  });

  describe('removeLine()', () => {
    it('should remove a line from a draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLineById.mockResolvedValue({
        id: 'line-001',
        orderId: 'order-001',
      });
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue([]);

      await service.removeLine(tenantId, 'order-001', 'line-001', auditContext as any);

      expect(salesOrderLinesRepository.softDeleteLine).toHaveBeenCalledTimes(1);
    });

    it('should throw when removing line from non-draft SO', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeConfirmedOrder());

      await expect(
        service.removeLine(tenantId, 'order-001', 'line-001', auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when line does not exist', async () => {
      salesOrdersRepository.findOneById.mockResolvedValue(makeDraftOrder());
      salesOrderLinesRepository.findLineById.mockResolvedValue(null);

      await expect(
        service.removeLine(tenantId, 'order-001', 'nonexistent', auditContext as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Delivery status transitions ──────────────────────────────────────────

  describe('delivery status transitions', () => {
    it('should set deliveryStatus=pending when no deliveries exist', async () => {
      const order = makeConfirmedOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedDeliveries.mockResolvedValue({
        total: 0,
        done: 0,
      });

      await service.createDelivery(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"deliveryStatus" = :deliveryStatus']),
        expect.objectContaining({
          deliveryStatus: SalesOrderDeliveryStatus.PENDING,
        }),
      );
    });

    it('should set deliveryStatus=partial when some deliveries exist', async () => {
      const order = makeConfirmedOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedDeliveries.mockResolvedValue({
        total: 2,
        done: 1,
      });

      await service.createDelivery(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"deliveryStatus" = :deliveryStatus']),
        expect.objectContaining({
          deliveryStatus: SalesOrderDeliveryStatus.PARTIAL,
        }),
      );
    });

    it('should set deliveryStatus=done when all deliveries are done', async () => {
      const order = makeConfirmedOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedDeliveries.mockResolvedValue({
        total: 2,
        done: 2,
      });

      await service.createDelivery(tenantId, 'order-001', auditContext as any);

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"deliveryStatus" = :deliveryStatus']),
        expect.objectContaining({
          deliveryStatus: SalesOrderDeliveryStatus.DONE,
        }),
      );
    });
  });

  // ─── Invoice status transitions ───────────────────────────────────────────

  describe('invoice status transitions', () => {
    it('should set invoiceStatus=to_invoice when no invoices exist', async () => {
      const order = makeConfirmedOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedInvoices.mockResolvedValue({ total: 0 });

      await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.REGULAR } as any,
        auditContext as any,
      );

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"invoiceStatus" = :invoiceStatus']),
        expect.objectContaining({
          invoiceStatus: SalesOrderInvoiceStatus.TO_INVOICE,
        }),
      );
    });

    it('should set invoiceStatus=invoiced when invoices exist', async () => {
      const order = makeConfirmedOrder();
      salesOrdersRepository.findOneById.mockResolvedValue(order);
      salesOrderLinesRepository.findLinesByOrderId.mockResolvedValue(order.lines);
      salesOrdersRepository.countLinkedInvoices.mockResolvedValue({ total: 1 });

      await service.createInvoice(
        tenantId,
        'order-001',
        { type: CreateInvoiceType.REGULAR } as any,
        auditContext as any,
      );

      expect(salesOrdersRepository.updateOrder).toHaveBeenCalledWith(
        tenantId,
        'order-001',
        expect.arrayContaining(['"invoiceStatus" = :invoiceStatus']),
        expect.objectContaining({
          invoiceStatus: SalesOrderInvoiceStatus.INVOICED,
        }),
      );
    });
  });
});
