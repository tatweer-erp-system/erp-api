import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { Transaction } from 'sequelize';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SalesOrderLinesRepository } from '@/database/sql/repositories/sales-order-lines.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { InvoicesService } from '@/modules/invoices/services/invoices.service';
import { DeliveriesService } from '@/modules/deliveries/services/deliveries.service';
import { PricelistsService } from '@/modules/pricelists/services/pricelists.service';
import { FiscalPositionsService } from '@/modules/fiscal-positions/services/fiscal-positions.service';
import { DownPaymentsService } from '@/modules/down-payments/services/down-payments.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { CreateSalesOrderLineDto } from '../dto/create-sales-order-line.dto';
import { UpdateSalesOrderLineDto } from '../dto/update-sales-order-line.dto';
import { CreateInvoiceFromSODto, CreateInvoiceType } from '../dto/create-invoice-from-so.dto';
import { SalesReportQueryDto } from '../dto/sales-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  SalesOrderStatus,
  SalesOrderInvoiceStatus,
  SalesOrderDeliveryStatus,
  SalesDiscountType,
} from '@/common/enums/crm.enums';
import { InvoiceTypeNew } from '@/common/enums/invoice.enums';
import { DownPaymentType } from '@/common/enums/pricelist.enums';
import { ProductType } from '@/common/enums/pos.enums';
import { SequenceEntity } from '@/common/enums/sequence.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import {
  SalesOrderLineCalculation,
  SalesOrderCalculationResult,
} from '../interfaces/sales.interfaces';

const ENTITY_TABLE = 'sales_orders';
const TRANSITION_ENTITY = 'sales_order';
const VAT_RATE = 15;

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly salesOrderLinesRepository: SalesOrderLinesRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly partnersRepository: PartnersRepository,
    private readonly warehousesRepository: WarehousesRepository,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly auditService: AuditSharedService,
    private readonly sequencesService: SequencesService,
    private readonly currencyService: CurrencyService,
    private readonly inventoryService: InventorySharedService,
    private readonly invoicesService: InvoicesService,
    private readonly deliveriesService: DeliveriesService,
    private readonly pricelistsService: PricelistsService,
    private readonly fiscalPositionsService: FiscalPositionsService,
    private readonly downPaymentsService: DownPaymentsService,
  ) {
    // Register status transitions: Draft → Confirmed → Done → Cancelled
    this.statusTransitionService.registerTransitions(TRANSITION_ENTITY, [
      { from: SalesOrderStatus.DRAFT, to: SalesOrderStatus.CONFIRMED },
      { from: SalesOrderStatus.CONFIRMED, to: SalesOrderStatus.DONE },
      {
        from: [SalesOrderStatus.DRAFT, SalesOrderStatus.CONFIRMED],
        to: SalesOrderStatus.CANCELLED,
      },
    ]);
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.salesOrdersRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search,
      sortOrder,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const order = await this.salesOrdersRepository.findOneById(tenantId, id);
    if (!order) throw new NotFoundException(msg(ErrorMessages.SALES_ORDER_NOT_FOUND, id));

    const lines = await this.salesOrderLinesRepository.findLinesByOrderId(tenantId, id);
    return { ...order, lines };
  }

  async getSalesSummary(tenantId: string, query: SalesReportQueryDto) {
    return this.salesOrdersRepository.getSalesReportSummary(tenantId, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      branchId: query.branchId,
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateSalesOrderDto, auditContext: AuditContext) {
    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      // Validate partner exists
      const partner = await this.partnersRepository.findOneById(tenantId, dto.partnerId);
      if (!partner) {
        throw new NotFoundException(msg(ErrorMessages.PARTNER_NOT_FOUND, dto.partnerId));
      }

      // Resolve currency — default to tenant base currency
      let currencyId = dto.currencyId ?? null;
      if (!currencyId) {
        const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
        currencyId = baseCurrency.id;
      }

      // Resolve pricelist — from DTO, or fall back to partner default
      const pricelistId = dto.pricelistId ?? partner.pricelistId ?? null;

      // Resolve payment term — from DTO, or fall back to partner default
      const paymentTermId = dto.paymentTermId ?? partner.paymentTermId ?? null;

      // Resolve fiscal position — from DTO, or fall back to partner default
      const fiscalPositionId = dto.fiscalPositionId ?? partner.fiscalPositionId ?? null;

      const id = uuidv7();

      // Generate order number via sequences service
      const orderNumber = await this.sequencesService.nextNumber(
        tenantId,
        SequenceEntity.SALES_ORDER,
        dto.branchId,
      );

      // Apply pricelist if set (compute prices for each line)
      const resolvedLines = await this.applyPricelist(tenantId, pricelistId, dto.lines);

      // Apply fiscal position tax remapping if set
      const taxRemappedLines = await this.applyFiscalPosition(
        tenantId,
        fiscalPositionId,
        resolvedLines,
      );

      // Calculate line totals
      const lineCalculations = this.calculateLines(
        taxRemappedLines,
        dto.discountType as SalesDiscountType | undefined,
        dto.discountValue,
      );

      // Insert order
      await this.salesOrdersRepository.insertOrder(
        tenantId,
        {
          id,
          orderNumber,
          partnerId: dto.partnerId,
          branchId: dto.branchId ?? null,
          pricelistId,
          paymentTermId,
          salespersonId: dto.salespersonId ?? null,
          fiscalPositionId,
          subtotal: lineCalculations.subtotal,
          discountAmount: lineCalculations.totalDiscount,
          taxAmount: lineCalculations.totalTax,
          totalAmount: lineCalculations.grandTotal,
          currencyId,
          exchangeRate: 1,
          totalAmountBase: lineCalculations.grandTotal,
          discountType: dto.discountType ?? null,
          discountValue: dto.discountValue ?? null,
          notes: dto.notes ?? null,
          createdBy: auditContext.userId ?? null,
        },
        transaction,
      );

      // Insert lines
      for (let i = 0; i < lineCalculations.lines.length; i++) {
        const lineCalc = lineCalculations.lines[i];
        await this.salesOrderLinesRepository.insertLine(
          tenantId,
          {
            id: uuidv7(),
            orderId: id,
            productId: lineCalc.productId,
            productVariantId: lineCalc.productVariantId,
            description: lineCalc.description,
            quantity: lineCalc.quantity,
            unitPrice: lineCalc.unitPrice,
            discountPct: lineCalc.discountPct,
            discountAmount: lineCalc.discountAmount,
            taxRate: lineCalc.taxRate,
            taxAmount: lineCalc.taxAmount,
            lineTotal: lineCalc.lineTotal,
            currencyId,
            lineTotalBase: lineCalc.lineTotal,
            sequence: lineCalc.sequence,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        );
      }

      // Write outbox event
      await this.outboxService.createEvent({
        tenantId,
        eventType: 'sales_order.created',
        payload: {
          orderId: id,
          orderNumber,
          partnerId: dto.partnerId,
          totalAmount: lineCalculations.grandTotal,
          currencyId,
        },
        transaction,
      });

      await transaction.commit();

      await this.auditService.logCreate(
        tenantId,
        ENTITY_TABLE,
        id,
        { orderNumber, partnerId: dto.partnerId },
        auditContext.userId,
      );

      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Update (draft only) ─────────────────────────────────────────────────────

  async update(tenantId: string, id: string, dto: UpdateSalesOrderDto, auditContext: AuditContext) {
    const existing = await this.salesOrdersRepository.findOneById(tenantId, id);
    if (!existing) throw new NotFoundException(msg(ErrorMessages.SALES_ORDER_NOT_FOUND, id));

    if (existing.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_DRAFT_ONLY_EDIT, id));
    }

    if (existing.version !== undefined && existing.version !== dto.version) {
      throw new ConflictException(
        msg(ErrorMessages.VERSION_CONFLICT, dto.version, existing.version),
      );
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const updates: string[] = [
        '"updatedAt" = NOW()',
        '"updatedBy" = :updatedBy',
        'version = version + 1',
      ];
      const replacements: Record<string, unknown> = {
        id,
        updatedBy: auditContext.userId ?? null,
      };

      if (dto.partnerId !== undefined) {
        updates.push('"partnerId" = :partnerId');
        replacements.partnerId = dto.partnerId;
      }
      if (dto.pricelistId !== undefined) {
        updates.push('"pricelistId" = :pricelistId');
        replacements.pricelistId = dto.pricelistId;
      }
      if (dto.paymentTermId !== undefined) {
        updates.push('"paymentTermId" = :paymentTermId');
        replacements.paymentTermId = dto.paymentTermId;
      }
      if (dto.salespersonId !== undefined) {
        updates.push('"salespersonId" = :salespersonId');
        replacements.salespersonId = dto.salespersonId;
      }
      if (dto.fiscalPositionId !== undefined) {
        updates.push('"fiscalPositionId" = :fiscalPositionId');
        replacements.fiscalPositionId = dto.fiscalPositionId;
      }
      if (dto.notes !== undefined) {
        updates.push('notes = :notes');
        replacements.notes = dto.notes;
      }
      if (dto.discountType !== undefined) {
        updates.push('"discountType" = :discountType');
        replacements.discountType = dto.discountType;
      }
      if (dto.discountValue !== undefined) {
        updates.push('"discountValue" = :discountValue');
        replacements.discountValue = dto.discountValue;
      }

      // If lines are provided, replace all lines and recalculate totals
      if (dto.lines !== undefined) {
        // Delete old lines
        await this.salesOrderLinesRepository.deleteByOrderId(tenantId, id, transaction);

        // Resolve pricelist
        const pricelistId = (dto.pricelistId ?? existing.pricelistId) as string | null;
        const fiscalPositionId = (dto.fiscalPositionId ?? existing.fiscalPositionId) as
          | string
          | null;

        const resolvedLines = await this.applyPricelist(tenantId, pricelistId, dto.lines);
        const taxRemappedLines = await this.applyFiscalPosition(
          tenantId,
          fiscalPositionId,
          resolvedLines,
        );

        const discountType = (dto.discountType ?? existing.discountType) as
          | SalesDiscountType
          | undefined;
        const discountValue = dto.discountValue ?? existing.discountValue;
        const lineCalculations = this.calculateLines(taxRemappedLines, discountType, discountValue);

        const currencyId = existing.currencyId as string | null;

        // Insert new lines
        for (let i = 0; i < lineCalculations.lines.length; i++) {
          const lineCalc = lineCalculations.lines[i];
          await this.salesOrderLinesRepository.insertLine(
            tenantId,
            {
              id: uuidv7(),
              orderId: id,
              productId: lineCalc.productId,
              productVariantId: lineCalc.productVariantId,
              description: lineCalc.description,
              quantity: lineCalc.quantity,
              unitPrice: lineCalc.unitPrice,
              discountPct: lineCalc.discountPct,
              discountAmount: lineCalc.discountAmount,
              taxRate: lineCalc.taxRate,
              taxAmount: lineCalc.taxAmount,
              lineTotal: lineCalc.lineTotal,
              currencyId,
              lineTotalBase: lineCalc.lineTotal,
              sequence: lineCalc.sequence,
              createdBy: auditContext.userId ?? null,
            },
            transaction,
          );
        }

        // Update order totals
        updates.push('subtotal = :subtotal');
        replacements.subtotal = lineCalculations.subtotal;
        updates.push('"discountAmount" = :discountAmount');
        replacements.discountAmount = lineCalculations.totalDiscount;
        updates.push('"taxAmount" = :taxAmount');
        replacements.taxAmount = lineCalculations.totalTax;
        updates.push('"totalAmount" = :totalAmount');
        replacements.totalAmount = lineCalculations.grandTotal;
        updates.push('"totalAmountBase" = :totalAmountBase');
        replacements.totalAmountBase = lineCalculations.grandTotal;
      }

      await this.salesOrdersRepository.updateOrder(
        tenantId,
        id,
        updates,
        replacements,
        transaction,
      );

      await transaction.commit();
      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Confirm ──────────────────────────────────────────────────────────────────

  async confirm(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, id);

    this.statusTransitionService.validateOrThrow(
      TRANSITION_ENTITY,
      order.status,
      SalesOrderStatus.CONFIRMED,
    );

    // Ensure there are lines
    const lines = (order.lines ?? []) as Record<string, unknown>[];
    if (lines.length === 0) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_NO_LINES, id));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      // Lock exchange rate at confirmation
      let exchangeRate = 1;
      let totalAmountBase = parseFloat(String(order.totalAmount));
      const currencyId = order.currencyId as string | null;

      if (currencyId) {
        const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
        if (currencyId !== baseCurrency.id) {
          exchangeRate = await this.currencyService.getRate(tenantId, currencyId, baseCurrency.id);
          totalAmountBase = this.currencyService.convert(
            parseFloat(String(order.totalAmount)),
            exchangeRate,
          );
        }
      }

      // Reserve stock for storable products
      const warehouseId = await this.resolveWarehouseId(tenantId);

      for (const line of lines) {
        const productId = line.productId as string;
        if (!productId) continue;

        const product = await this.productsRepository.findById(tenantId, productId);
        if (!product || product.productType !== ProductType.STORABLE) continue;

        const quantity = parseFloat(String(line.quantity));

        // Check availability before reserving
        const stockLevel = await this.inventoryService.getStockLevel(
          tenantId,
          productId,
          warehouseId,
        );
        const currentQty =
          stockLevel.length > 0 ? parseFloat(String(stockLevel[0].quantity ?? 0)) : 0;
        const currentReserved =
          stockLevel.length > 0 ? parseFloat(String(stockLevel[0].reservedQuantity ?? 0)) : 0;
        const available = currentQty - currentReserved;

        if (quantity > available) {
          const productName = product.nameEn ?? productId;
          throw new BadRequestException(
            msg(ErrorMessages.STOCK_RESERVATION_FAILED, productName, available, quantity),
          );
        }
      }

      // All checks passed — reserve stock
      for (const line of lines) {
        const productId = line.productId as string;
        if (!productId) continue;

        const product = await this.productsRepository.findById(tenantId, productId);
        if (!product || product.productType !== ProductType.STORABLE) continue;

        const quantity = parseFloat(String(line.quantity));
        await this.inventoryService.reserveStock(
          tenantId,
          productId,
          warehouseId,
          quantity,
          transaction,
        );
      }

      // Update order: status, exchange rate, confirmed timestamp
      await this.salesOrdersRepository.updateOrder(
        tenantId,
        id,
        [
          'status = :status',
          '"invoiceStatus" = :invoiceStatus',
          '"updatedBy" = :updatedBy',
          '"updatedAt" = NOW()',
          '"confirmedAt" = NOW()',
          '"exchangeRate" = :exchangeRate',
          '"totalAmountBase" = :totalAmountBase',
          'version = version + 1',
        ],
        {
          id,
          status: SalesOrderStatus.CONFIRMED,
          invoiceStatus: SalesOrderInvoiceStatus.TO_INVOICE,
          updatedBy: auditContext.userId ?? null,
          exchangeRate,
          totalAmountBase,
        },
        transaction,
      );

      // Update line base amounts
      for (const line of lines) {
        const lineRecord = line as Record<string, unknown>;
        const lineTotal = parseFloat(String(lineRecord.lineTotal ?? 0));
        const lineTotalBase = this.currencyService.convert(lineTotal, exchangeRate);
        const lineId = lineRecord.id as string;

        await this.salesOrderLinesRepository.updateLine(
          tenantId,
          lineId,
          ['"lineTotalBase" = :lineTotalBase', '"currencyId" = :currencyId'],
          { lineTotalBase, currencyId },
          transaction,
        );
      }

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'sales_order.confirmed',
        payload: {
          orderId: id,
          orderNumber: order.orderNumber,
          partnerId: order.partnerId,
          totalAmount: order.totalAmount,
          totalAmountBase,
          exchangeRate,
          currencyId,
        },
        transaction,
      });

      await transaction.commit();

      await this.auditService.logStatusChange(
        tenantId,
        ENTITY_TABLE,
        id,
        SalesOrderStatus.DRAFT,
        SalesOrderStatus.CONFIRMED,
        auditContext.userId,
      );

      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Create Invoice from SO ────────────────────────────────────────────────

  async createInvoice(
    tenantId: string,
    id: string,
    dto: CreateInvoiceFromSODto,
    auditContext: AuditContext,
  ) {
    const order = await this.findById(tenantId, id);

    // Must be confirmed (or done) to create invoice
    if (order.status !== SalesOrderStatus.CONFIRMED && order.status !== SalesOrderStatus.DONE) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_NOT_CONFIRMED, id));
    }

    const partnerId = order.partnerId as string;
    const branchId = order.branchId as string;
    const lines = (order.lines ?? []) as Record<string, unknown>[];
    const today = new Date().toISOString().split('T')[0];

    if (dto.type === CreateInvoiceType.REGULAR) {
      // Create a regular invoice from all SO lines
      const invoiceLines = lines.map((line) => ({
        productId: (line.productId as string) ?? undefined,
        productVariantId: (line.productVariantId as string) ?? undefined,
        description: (line.description as string) ?? '',
        quantity: parseFloat(String(line.quantity)),
        unitPrice: parseFloat(String(line.unitPrice)),
        discountPct: parseFloat(String(line.discountPct ?? 0)),
      }));

      const invoice = await this.invoicesService.create(
        tenantId,
        {
          branchId,
          partnerId,
          invoiceType: InvoiceTypeNew.OUT_INVOICE,
          invoiceDate: today,
          saleOrderId: id,
          currencyId: (order.currencyId as string) ?? undefined,
          exchangeRate: parseFloat(String(order.exchangeRate ?? 1)),
          fiscalPositionId: (order.fiscalPositionId as string) ?? undefined,
          lines: invoiceLines,
        },
        auditContext,
      );

      // Update SO invoice status
      await this.refreshInvoiceStatus(tenantId, id);

      return invoice;
    }

    // Down payment invoice
    if (
      dto.type === CreateInvoiceType.DOWN_PAYMENT_PERCENTAGE ||
      dto.type === CreateInvoiceType.DOWN_PAYMENT_FIXED
    ) {
      const dpValue = dto.value ?? 0;
      const orderTotal = parseFloat(String(order.totalAmount));
      let dpAmount: number;

      if (dto.type === CreateInvoiceType.DOWN_PAYMENT_PERCENTAGE) {
        if (dpValue < 0.01 || dpValue > 100) {
          throw new BadRequestException('Down payment percentage must be between 0.01 and 100');
        }
        dpAmount = Math.round(orderTotal * dpValue) / 100;
      } else {
        dpAmount = dpValue;
        if (dpAmount <= 0 || dpAmount > orderTotal) {
          throw new BadRequestException(
            'Down payment amount must be between 0 and the order total',
          );
        }
      }

      dpAmount = Math.round(dpAmount * 100) / 100;

      // Create invoice for the down payment amount
      const invoice = await this.invoicesService.create(
        tenantId,
        {
          branchId,
          partnerId,
          invoiceType: InvoiceTypeNew.OUT_INVOICE,
          invoiceDate: today,
          saleOrderId: id,
          currencyId: (order.currencyId as string) ?? undefined,
          exchangeRate: parseFloat(String(order.exchangeRate ?? 1)),
          reference: `Down payment for ${order.orderNumber}`,
          lines: [
            {
              description: `Down payment for SO ${order.orderNumber}`,
              quantity: 1,
              unitPrice: dpAmount,
              discountPct: 0,
            },
          ],
        },
        auditContext,
      );

      // Record the down payment
      const invoiceRecord = invoice as unknown as Record<string, unknown>;
      const dpType =
        dto.type === CreateInvoiceType.DOWN_PAYMENT_PERCENTAGE
          ? DownPaymentType.PERCENTAGE
          : DownPaymentType.FIXED;

      await this.downPaymentsService.create(
        tenantId,
        id,
        {
          branchId,
          type: dpType,
          value: dpValue,
          invoiceId: invoiceRecord.id as string,
        },
        auditContext,
      );

      // Update SO invoice status
      await this.refreshInvoiceStatus(tenantId, id);

      return invoice;
    }

    throw new BadRequestException(`Unknown invoice creation type: ${dto.type}`);
  }

  // ── Create Delivery from SO ───────────────────────────────────────────────

  async createDelivery(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, id);

    // Must be confirmed (or done) to create delivery
    if (order.status !== SalesOrderStatus.CONFIRMED && order.status !== SalesOrderStatus.DONE) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_NOT_CONFIRMED, id));
    }

    const partnerId = order.partnerId as string;
    const branchId = order.branchId as string;
    const lines = (order.lines ?? []) as Record<string, unknown>[];

    // Build delivery lines from SO lines (only lines with remaining qty to deliver)
    const deliveryLines = lines
      .filter((line) => {
        const qty = parseFloat(String(line.quantity));
        const delivered = parseFloat(String(line.qtyDelivered ?? 0));
        return qty - delivered > 0;
      })
      .map((line) => ({
        productId: line.productId as string,
        saleOrderLineId: line.id as string,
        productVariantId: (line.productVariantId as string) ?? undefined,
        qtyDemand: parseFloat(String(line.quantity)) - parseFloat(String(line.qtyDelivered ?? 0)),
        qtyDone: 0,
      }));

    if (deliveryLines.length === 0) {
      throw new BadRequestException('No lines remaining to deliver');
    }

    const delivery = await this.deliveriesService.create(
      tenantId,
      {
        branchId,
        saleOrderId: id,
        partnerId,
        lines: deliveryLines,
      },
      auditContext,
    );

    // Update SO delivery status
    await this.refreshDeliveryStatus(tenantId, id);

    return delivery;
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, id);

    this.statusTransitionService.validateOrThrow(
      TRANSITION_ENTITY,
      order.status,
      SalesOrderStatus.CANCELLED,
    );

    // Block cancellation if invoices or deliveries exist
    const hasInvoices = await this.salesOrdersRepository.hasLinkedInvoices(tenantId, id);
    if (hasInvoices) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_HAS_INVOICES, id));
    }

    const hasDeliveries = await this.salesOrdersRepository.hasLinkedDeliveries(tenantId, id);
    if (hasDeliveries) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_HAS_DELIVERIES, id));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      // Release reservations if order was confirmed
      if (order.status === SalesOrderStatus.CONFIRMED) {
        const warehouseId = await this.resolveWarehouseId(tenantId);
        const lines = (order.lines ?? []) as Record<string, unknown>[];

        for (const line of lines) {
          const productId = line.productId as string;
          if (!productId) continue;

          const product = await this.productsRepository.findById(tenantId, productId);
          if (!product || product.productType !== ProductType.STORABLE) continue;

          const quantity = parseFloat(String(line.quantity));
          await this.inventoryService.releaseReservation(
            tenantId,
            productId,
            warehouseId,
            quantity,
            transaction,
          );
        }
      }

      await this.salesOrdersRepository.updateOrder(
        tenantId,
        id,
        [
          'status = :status',
          '"updatedBy" = :updatedBy',
          '"updatedAt" = NOW()',
          'version = version + 1',
        ],
        {
          id,
          status: SalesOrderStatus.CANCELLED,
          updatedBy: auditContext.userId ?? null,
        },
        transaction,
      );

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'sales_order.cancelled',
        payload: {
          orderId: id,
          orderNumber: order.orderNumber,
        },
        transaction,
      });

      await transaction.commit();

      await this.auditService.logStatusChange(
        tenantId,
        ENTITY_TABLE,
        id,
        order.status,
        SalesOrderStatus.CANCELLED,
        auditContext.userId,
      );

      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Soft Delete (draft only) ───────────────────────────────────────────────

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.salesOrdersRepository.findOneById(tenantId, id);
    if (!order) throw new NotFoundException(msg(ErrorMessages.SALES_ORDER_NOT_FOUND, id));

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_DRAFT_ONLY_DELETE, id));
    }

    await this.salesOrdersRepository.softDeleteOrder(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(
      tenantId,
      ENTITY_TABLE,
      id,
      { orderNumber: order.orderNumber },
      auditContext.userId,
    );
  }

  // ── Line management (for draft orders) ─────────────────────────────────────

  async addLine(
    tenantId: string,
    orderId: string,
    dto: CreateSalesOrderLineDto,
    auditContext: AuditContext,
  ) {
    const order = await this.salesOrdersRepository.findOneById(tenantId, orderId);
    if (!order) throw new NotFoundException(msg(ErrorMessages.SALES_ORDER_NOT_FOUND, orderId));

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_DRAFT_ONLY_EDIT, orderId));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const product = await this.productsRepository.findById(tenantId, dto.productId);
      const taxRate = dto.taxRate ?? VAT_RATE;
      const discountPct = dto.discountPct ?? 0;

      const lineSubtotal = dto.quantity * dto.unitPrice;
      const discountAmount = Math.round(lineSubtotal * discountPct) / 100;
      const taxableAmount = lineSubtotal - discountAmount;
      const taxAmount = Math.round(taxableAmount * taxRate) / 100;
      const lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

      const lineId = uuidv7();
      await this.salesOrderLinesRepository.insertLine(
        tenantId,
        {
          id: lineId,
          orderId,
          productId: dto.productId,
          productVariantId: dto.productVariantId ?? null,
          description: dto.description ?? product?.nameEn ?? '',
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          discountPct,
          discountAmount: Math.round(discountAmount * 100) / 100,
          taxRate,
          taxAmount: Math.round(taxAmount * 100) / 100,
          lineTotal,
          currencyId: order.currencyId ?? null,
          lineTotalBase: lineTotal,
          sequence: 0,
          createdBy: auditContext.userId ?? null,
        },
        transaction,
      );

      // Recalculate order totals
      await this.recalculateOrderTotals(tenantId, orderId, auditContext, transaction);

      await transaction.commit();
      return this.findById(tenantId, orderId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateLine(
    tenantId: string,
    orderId: string,
    lineId: string,
    dto: UpdateSalesOrderLineDto,
    auditContext: AuditContext,
  ) {
    const order = await this.salesOrdersRepository.findOneById(tenantId, orderId);
    if (!order) throw new NotFoundException(msg(ErrorMessages.SALES_ORDER_NOT_FOUND, orderId));

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_DRAFT_ONLY_EDIT, orderId));
    }

    const line = await this.salesOrderLinesRepository.findLineById(tenantId, lineId);
    if (!line || line.orderId !== orderId) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Sales order line', lineId));
    }

    if (line.version !== undefined && line.version !== dto.version) {
      throw new ConflictException(msg(ErrorMessages.VERSION_CONFLICT, dto.version, line.version));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const quantity = dto.quantity ?? parseFloat(String(line.quantity));
      const unitPrice = dto.unitPrice ?? parseFloat(String(line.unitPrice));
      const discountPct = dto.discountPct ?? parseFloat(String(line.discountPct ?? 0));
      const taxRate = dto.taxRate ?? parseFloat(String(line.taxRate));

      const lineSubtotal = quantity * unitPrice;
      const discountAmount = Math.round(lineSubtotal * discountPct) / 100;
      const taxableAmount = lineSubtotal - discountAmount;
      const taxAmount = Math.round(taxableAmount * taxRate) / 100;
      const lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

      const updates: string[] = [
        'quantity = :quantity',
        '"unitPrice" = :unitPrice',
        '"discountPct" = :discountPct',
        '"discountAmount" = :discountAmount',
        '"taxRate" = :taxRate',
        '"taxAmount" = :taxAmount',
        '"lineTotal" = :lineTotal',
        '"lineTotalBase" = :lineTotalBase',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
        'version = version + 1',
      ];
      const replacements: Record<string, unknown> = {
        quantity,
        unitPrice,
        discountPct,
        discountAmount: Math.round(discountAmount * 100) / 100,
        taxRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        lineTotal,
        lineTotalBase: lineTotal,
        updatedBy: auditContext.userId ?? null,
      };

      if (dto.description !== undefined) {
        updates.push('description = :description');
        replacements.description = dto.description;
      }

      await this.salesOrderLinesRepository.updateLine(
        tenantId,
        lineId,
        updates,
        replacements,
        transaction,
      );

      // Recalculate order totals
      await this.recalculateOrderTotals(tenantId, orderId, auditContext, transaction);

      await transaction.commit();
      return this.findById(tenantId, orderId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async removeLine(tenantId: string, orderId: string, lineId: string, auditContext: AuditContext) {
    const order = await this.salesOrdersRepository.findOneById(tenantId, orderId);
    if (!order) throw new NotFoundException(msg(ErrorMessages.SALES_ORDER_NOT_FOUND, orderId));

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.SALES_ORDER_DRAFT_ONLY_EDIT, orderId));
    }

    const line = await this.salesOrderLinesRepository.findLineById(tenantId, lineId);
    if (!line || line.orderId !== orderId) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Sales order line', lineId));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      await this.salesOrderLinesRepository.softDeleteLine(
        tenantId,
        lineId,
        auditContext.userId ?? null,
        transaction,
      );

      // Recalculate order totals
      await this.recalculateOrderTotals(tenantId, orderId, auditContext, transaction);

      await transaction.commit();
      return this.findById(tenantId, orderId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Apply pricelist pricing to lines. If no pricelist, returns lines unchanged.
   */
  private async applyPricelist(
    tenantId: string,
    pricelistId: string | null,
    lines: CreateSalesOrderLineDto[],
  ): Promise<CreateSalesOrderLineDto[]> {
    if (!pricelistId) return lines;

    const resolvedLines: CreateSalesOrderLineDto[] = [];
    for (const line of lines) {
      try {
        const result = await this.pricelistsService.computePrice(tenantId, {
          pricelistId,
          productId: line.productId,
          qty: line.quantity,
        });

        resolvedLines.push({
          ...line,
          unitPrice: result.computedPrice,
          // If pricelist gives a discount and line has no explicit discountPct, apply it
          discountPct:
            line.discountPct ??
            (result.discount > 0 && result.originalPrice > 0
              ? Math.round((result.discount / result.originalPrice) * 10000) / 100
              : 0),
        });
      } catch {
        // If pricelist computation fails, keep original line
        resolvedLines.push(line);
      }
    }
    return resolvedLines;
  }

  /**
   * Apply fiscal position tax remapping. Currently a placeholder that resolves
   * tax rate based on fiscal position configuration. In the current simple VAT model,
   * this is a no-op unless the fiscal position maps the standard tax to zero.
   */
  private async applyFiscalPosition(
    _tenantId: string,
    _fiscalPositionId: string | null,
    lines: CreateSalesOrderLineDto[],
  ): Promise<CreateSalesOrderLineDto[]> {
    // In the current flat-rate VAT model, fiscal position remapping
    // is done at invoice time. SO lines keep their original tax rates.
    return lines;
  }

  /**
   * Calculates line-level and order-level totals.
   * Tax is always calculated after discount: tax = (subtotal - discount) * taxRate
   */
  private calculateLines(
    dtoLines: CreateSalesOrderLineDto[],
    orderDiscountType?: SalesDiscountType,
    orderDiscountValue?: number,
  ): SalesOrderCalculationResult {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const lines: SalesOrderLineCalculation[] = dtoLines.map((line, index) => {
      const taxRate = line.taxRate ?? VAT_RATE;
      const discountPct = line.discountPct ?? 0;

      const lineSubtotal = line.quantity * line.unitPrice;
      const lineDiscountAmount = Math.round(lineSubtotal * discountPct) / 100;
      const taxableAmount = lineSubtotal - lineDiscountAmount;
      const taxAmount = Math.round(taxableAmount * taxRate) / 100;
      const lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

      subtotal += Math.round(lineSubtotal * 100) / 100;
      totalDiscount += Math.round(lineDiscountAmount * 100) / 100;
      totalTax += Math.round(taxAmount * 100) / 100;

      return {
        productId: line.productId ?? null,
        productVariantId: line.productVariantId ?? null,
        description: line.description ?? '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPct,
        discountAmount: Math.round(lineDiscountAmount * 100) / 100,
        taxRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        lineTotal,
        lineTotalBase: null,
        currencyId: null,
        sequence: index,
      };
    });

    // Apply order-level discount
    let orderDiscountAmount = 0;
    if (orderDiscountType && orderDiscountValue && orderDiscountValue > 0) {
      if (orderDiscountType === SalesDiscountType.PERCENTAGE) {
        orderDiscountAmount = Math.round(subtotal * orderDiscountValue) / 100;
      } else {
        orderDiscountAmount = orderDiscountValue;
      }
      totalDiscount += Math.round(orderDiscountAmount * 100) / 100;
    }

    const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

    return {
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.max(0, grandTotal),
    };
  }

  /**
   * Recalculates order totals from current lines.
   */
  private async recalculateOrderTotals(
    tenantId: string,
    orderId: string,
    auditContext: AuditContext,
    transaction: Transaction,
  ) {
    const lines = await this.salesOrderLinesRepository.findLinesByOrderId(
      tenantId,
      orderId,
      transaction,
    );

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const line of lines) {
      const qty = parseFloat(String(line.quantity));
      const price = parseFloat(String(line.unitPrice));
      subtotal += Math.round(qty * price * 100) / 100;
      totalDiscount += parseFloat(String(line.discountAmount ?? 0));
      totalTax += parseFloat(String(line.taxAmount ?? 0));
    }

    const totalAmount = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

    await this.salesOrdersRepository.updateOrder(
      tenantId,
      orderId,
      [
        'subtotal = :subtotal',
        '"discountAmount" = :discountAmount',
        '"taxAmount" = :taxAmount',
        '"totalAmount" = :totalAmount',
        '"totalAmountBase" = :totalAmountBase',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
        'version = version + 1',
      ],
      {
        id: orderId,
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount: Math.round(totalDiscount * 100) / 100,
        taxAmount: Math.round(totalTax * 100) / 100,
        totalAmount: Math.max(0, totalAmount),
        totalAmountBase: Math.max(0, totalAmount),
        updatedBy: auditContext.userId ?? null,
      },
      transaction,
    );
  }

  /**
   * Refreshes the SO invoiceStatus based on linked invoices.
   */
  private async refreshInvoiceStatus(tenantId: string, orderId: string) {
    const counts = await this.salesOrdersRepository.countLinkedInvoices(tenantId, orderId);

    let invoiceStatus: SalesOrderInvoiceStatus;
    if (counts.total === 0) {
      invoiceStatus = SalesOrderInvoiceStatus.TO_INVOICE;
    } else {
      // Consider invoiced when at least one invoice exists
      // A more granular check would compare invoiced amounts to order total
      invoiceStatus = SalesOrderInvoiceStatus.INVOICED;
    }

    await this.salesOrdersRepository.updateOrder(
      tenantId,
      orderId,
      ['"invoiceStatus" = :invoiceStatus', '"updatedAt" = NOW()'],
      { id: orderId, invoiceStatus },
    );

    // Check if we should mark the order as done
    await this.checkAndMarkDone(tenantId, orderId);
  }

  /**
   * Refreshes the SO deliveryStatus based on linked deliveries.
   */
  private async refreshDeliveryStatus(tenantId: string, orderId: string) {
    const counts = await this.salesOrdersRepository.countLinkedDeliveries(tenantId, orderId);

    let deliveryStatus: SalesOrderDeliveryStatus;
    if (counts.total === 0) {
      deliveryStatus = SalesOrderDeliveryStatus.PENDING;
    } else if (counts.done > 0 && counts.done === counts.total) {
      deliveryStatus = SalesOrderDeliveryStatus.DONE;
    } else {
      deliveryStatus = SalesOrderDeliveryStatus.PARTIAL;
    }

    await this.salesOrdersRepository.updateOrder(
      tenantId,
      orderId,
      ['"deliveryStatus" = :deliveryStatus', '"updatedAt" = NOW()'],
      { id: orderId, deliveryStatus },
    );

    // Check if we should mark the order as done
    await this.checkAndMarkDone(tenantId, orderId);
  }

  /**
   * Marks the SO as done if both invoiced and delivered.
   */
  private async checkAndMarkDone(tenantId: string, orderId: string) {
    const order = await this.salesOrdersRepository.findOneById(tenantId, orderId);
    if (!order || order.status !== SalesOrderStatus.CONFIRMED) return;

    if (
      order.invoiceStatus === SalesOrderInvoiceStatus.INVOICED &&
      order.deliveryStatus === SalesOrderDeliveryStatus.DONE
    ) {
      await this.salesOrdersRepository.updateOrder(
        tenantId,
        orderId,
        ['status = :status', '"updatedAt" = NOW()', 'version = version + 1'],
        { id: orderId, status: SalesOrderStatus.DONE },
      );
    }
  }

  /**
   * Resolves the default warehouse ID for the tenant.
   */
  private async resolveWarehouseId(tenantId: string): Promise<string> {
    const warehouse = await this.warehousesRepository.findDefault(tenantId);
    if (!warehouse) {
      throw new BadRequestException('No default warehouse configured for this tenant');
    }
    return warehouse.id as string;
  }
}
