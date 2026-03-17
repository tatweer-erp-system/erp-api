import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import {
  PurchaseOrderStatus,
  PurchaseOrderBillStatus,
  PurchaseOrderReceiptStatus,
} from '@/common/enums/purchasing.enums';
import { InvoiceTypeNew } from '@/common/enums/invoice.enums';
import { PurchaseOrdersRepository } from '@/database/sql/repositories/purchase-orders.repository';
import { PurchaseOrderLinesRepository } from '@/database/sql/repositories/purchase-order-lines.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { CreatePurchaseOrderLineDto } from '../dto/create-purchase-order-line.dto';
import { CreatePoReceiptDto } from '../dto/create-po-receipt.dto';
import { CreatePoBillDto } from '../dto/create-po-bill.dto';
import { PurchasingReportQueryDto } from '../dto/purchasing-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { ReceiptsService } from '@/modules/receipts/services/receipts.service';
import { InvoicesService } from '@/modules/invoices/services/invoices.service';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PurchasingSummary } from '../interfaces/purchasing.interface';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly purchaseOrderLinesRepository: PurchaseOrderLinesRepository,
    private readonly partnersRepository: PartnersRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly sequencesService: SequencesService,
    private readonly currencyService: CurrencyService,
    private readonly receiptsService: ReceiptsService,
    private readonly invoicesService: InvoicesService,
  ) {
    // Register purchase_order status transitions:
    // Draft (RFQ) → Confirmed (PO) → Done → Cancelled
    this.statusTransitionService.registerTransitions('purchase_order', [
      { from: PurchaseOrderStatus.DRAFT, to: PurchaseOrderStatus.CONFIRMED },
      { from: PurchaseOrderStatus.CONFIRMED, to: PurchaseOrderStatus.DONE },
      {
        from: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CONFIRMED],
        to: PurchaseOrderStatus.CANCELLED,
      },
    ]);
  }

  // ── List ─────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: PaginationDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.purchaseOrdersRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'DESC',
    });

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Single ───────────────────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }
    const lines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, id);
    return { ...order, lines };
  }

  // ── Create (as RFQ / Draft) ──────────────────────────────────────────────

  async create(tenantId: string, dto: CreatePurchaseOrderDto, auditContext: AuditContext) {
    // Validate partner is a supplier
    await this.validateSupplier(tenantId, dto.partnerId);

    // Generate order number via sequences service
    const orderNumber = await this.sequencesService.nextNumber(
      tenantId,
      'purchase_order',
      dto.branchId,
    );

    // Resolve currency
    const currencyId = dto.currencyId ?? null;
    let currencyCode = 'SAR';
    if (currencyId) {
      const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
      currencyCode = baseCurrency.id === currencyId ? baseCurrency.code : currencyCode;
    }

    const orderDiscountAmount = dto.discountAmount ?? 0;
    let subtotal = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;

    const lineData = dto.lines.map((line) => {
      const lineDiscount = line.discountAmount ?? 0;
      const lineSubtotal = line.quantity * line.unitPrice;
      // Tax after discount
      const taxableAmount = lineSubtotal - lineDiscount;
      const taxAmount = line.taxRate ? taxableAmount * (line.taxRate / 100) : 0;
      subtotal += lineSubtotal;
      totalLineDiscount += lineDiscount;
      totalTax += taxAmount;
      return {
        lineTotal: lineSubtotal - lineDiscount + taxAmount,
        taxAmount,
        discountAmount: lineDiscount,
        ...line,
      };
    });

    const totalDiscount = orderDiscountAmount + totalLineDiscount;
    const grandTotal = subtotal - totalDiscount + totalTax;

    const orderId = await this.purchaseOrdersRepository.insertOrder(tenantId, {
      orderNumber,
      partnerId: dto.partnerId,
      branchId: dto.branchId,
      buyerId: dto.buyerId ?? null,
      paymentTermId: dto.paymentTermId ?? null,
      subtotal,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      currency: currencyCode,
      currencyId,
      discountAmount: totalDiscount,
      status: PurchaseOrderStatus.DRAFT,
      billStatus: PurchaseOrderBillStatus.NOTHING,
      receiptStatus: PurchaseOrderReceiptStatus.NOTHING,
      expectedDeliveryDate: dto.expectedDeliveryDate || null,
      notes: dto.notes || null,
      createdBy: auditContext.userId || null,
    });

    for (const line of lineData) {
      await this.purchaseOrderLinesRepository.insertLine(tenantId, {
        orderId,
        productId: line.productId,
        productVariantId: line.productVariantId ?? null,
        description: line.description || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
        currencyId,
        discountAmount: line.discountAmount,
      });
    }

    const order = await this.findById(tenantId, orderId);

    await this.auditService.logCreate(
      tenantId,
      'purchasing.orders',
      orderId,
      order,
      auditContext.userId,
    );

    return order;
  }

  // ── Update (draft only) ──────────────────────────────────────────────────

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }
    const before = { ...existing };

    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, existing.orderNumber),
      );
    }

    // Optimistic locking check
    if (existing.version !== undefined && existing.version !== dto.version) {
      throw new ConflictException(msg(ErrorMessages.ORDER_VERSION_CONFLICT));
    }

    // Validate partner if changed
    if (dto.partnerId !== undefined) {
      await this.validateSupplier(tenantId, dto.partnerId);
    }

    const updates: string[] = ['version = version + 1'];
    const replacements: Record<string, unknown> = { id };

    if (dto.partnerId !== undefined) {
      updates.push('"partnerId" = :partnerId');
      updates.push('"vendorId" = :partnerId');
      replacements.partnerId = dto.partnerId;
    }
    if (dto.currencyId !== undefined) {
      updates.push('"currencyId" = :currencyId');
      replacements.currencyId = dto.currencyId;
    }
    if (dto.paymentTermId !== undefined) {
      updates.push('"paymentTermId" = :paymentTermId');
      replacements.paymentTermId = dto.paymentTermId;
    }
    if (dto.buyerId !== undefined) {
      updates.push('"buyerId" = :buyerId');
      replacements.buyerId = dto.buyerId;
    }
    if (dto.expectedDeliveryDate !== undefined) {
      updates.push('"expectedDeliveryDate" = :expectedDeliveryDate');
      replacements.expectedDeliveryDate = dto.expectedDeliveryDate;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }
    if (dto.discountAmount !== undefined) {
      updates.push('"discountAmount" = :discountAmount');
      replacements.discountAmount = dto.discountAmount;
    }

    if (dto.lines && dto.lines.length > 0) {
      // Delete existing lines and recreate
      await this.purchaseOrderLinesRepository.deleteByOrderId(tenantId, id);

      const currencyId = dto.currencyId ?? existing.currencyId ?? null;
      const orderDiscount = dto.discountAmount ?? 0;
      let subtotal = 0;
      let totalTax = 0;
      let totalLineDiscount = 0;

      for (const line of dto.lines) {
        const lineDiscount = line.discountAmount ?? 0;
        const lineSubtotal = line.quantity * line.unitPrice;
        const taxableAmount = lineSubtotal - lineDiscount;
        const taxAmount = line.taxRate ? taxableAmount * (line.taxRate / 100) : 0;
        subtotal += lineSubtotal;
        totalTax += taxAmount;
        totalLineDiscount += lineDiscount;

        await this.purchaseOrderLinesRepository.insertLine(tenantId, {
          orderId: id,
          productId: line.productId,
          productVariantId: line.productVariantId ?? null,
          description: line.description || '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxAmount,
          lineTotal: lineSubtotal - lineDiscount + taxAmount,
          currencyId,
          discountAmount: lineDiscount,
        });
      }

      const totalDiscount = orderDiscount + totalLineDiscount;
      updates.push('subtotal = :subtotal');
      replacements.subtotal = subtotal;
      updates.push('"taxAmount" = :taxAmount');
      replacements.taxAmount = totalTax;
      updates.push('"totalAmount" = :totalAmount');
      replacements.totalAmount = subtotal - totalDiscount + totalTax;
      if (dto.discountAmount === undefined) {
        updates.push('"discountAmount" = :discountAmount');
        replacements.discountAmount = totalDiscount;
      }
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId || null;
    updates.push('"updatedAt" = NOW()');

    await this.purchaseOrdersRepository.updateOrder(tenantId, id, updates, replacements);

    const updated = await this.findById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'purchasing.orders',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  // ── Confirm (Draft → Confirmed) ──────────────────────────────────────────

  async confirm(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    const targetStatus = PurchaseOrderStatus.CONFIRMED;
    this.statusTransitionService.validateOrThrow('purchase_order', order.status, targetStatus);

    // Assign sequence number if still draft-numbered, and lock exchange rate
    let exchangeRate = 1;
    let totalAmountBase: number | null = null;
    if (order.currencyId) {
      const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
      if (order.currencyId !== baseCurrency.id) {
        exchangeRate = await this.currencyService.getRate(
          tenantId,
          order.currencyId,
          baseCurrency.id,
        );
      }
      totalAmountBase = this.currencyService.convert(parseFloat(order.totalAmount), exchangeRate);

      // Update line-level base amounts
      const lines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, id);
      for (const line of lines) {
        const lineTotalBase = this.currencyService.convert(
          parseFloat(line.lineTotal),
          exchangeRate,
        );
        const sequelize = this.purchaseOrdersRepository.getSequelize();
        await sequelize.query(
          `UPDATE purchase_order_lines SET "lineTotalBase" = :lineTotalBase WHERE id = :lineId AND "tenantId" = :tenantId`,
          { replacements: { lineTotalBase, lineId: line.id, tenantId } } as any,
        );
      }
    }

    await this.purchaseOrdersRepository.updateOrder(
      tenantId,
      id,
      [
        'status = :status',
        '"exchangeRate" = :exchangeRate',
        '"totalAmountBase" = :totalAmountBase',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
      ],
      {
        id,
        status: targetStatus,
        exchangeRate,
        totalAmountBase,
        updatedBy: auditContext.userId || null,
      },
    );

    await this.auditService.logStatusChange(
      tenantId,
      'purchasing.orders',
      id,
      order.status,
      targetStatus,
      auditContext.userId,
    );

    // Check if expectedDeliveryDate is within 1 day and create outbox event
    if (order.expectedDeliveryDate) {
      const deliveryDate = new Date(order.expectedDeliveryDate);
      const now = new Date();
      const diffMs = deliveryDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays <= 1 && diffDays >= 0) {
        const sequelize = this.purchaseOrdersRepository.getSequelize();
        const outboxTransaction = await sequelize.transaction();
        try {
          await this.outboxService.createEvent(
            outboxTransaction,
            tenantId,
            'purchase_order_due',
            {
              orderId: id,
              orderNumber: order.orderNumber,
              expectedDeliveryDate: order.expectedDeliveryDate,
            },
            id,
            'purchase_order',
          );
          await outboxTransaction.commit();
        } catch (outboxError) {
          await outboxTransaction.rollback();
          this.logger.warn(`Failed to write outbox event for PO ${id} due: ${outboxError}`);
        }
      }
    }

    return this.findById(tenantId, id);
  }

  // ── Create Receipt (Confirmed → updates receiptStatus) ───────────────────

  async createReceipt(
    tenantId: string,
    id: string,
    dto: CreatePoReceiptDto,
    auditContext: AuditContext,
  ) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    if (
      order.status !== PurchaseOrderStatus.CONFIRMED &&
      order.status !== PurchaseOrderStatus.DONE
    ) {
      throw new BadRequestException(
        msg(ErrorMessages.PURCHASE_ORDER_NOT_CONFIRMED, order.orderNumber),
      );
    }

    // Build receipt lines from PO lines — only lines with remaining qty to receive
    const poLines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, id);
    const receiptLines = poLines
      .filter((line: any) => {
        const qtyOrdered = parseFloat(line.quantity);
        const qtyReceived = parseFloat(line.receivedQuantity ?? 0);
        return qtyOrdered > qtyReceived;
      })
      .map((line: any) => ({
        productId: line.productId,
        purchaseOrderLineId: line.id != null ? String(line.id) : undefined,
        productVariantId: line.productVariantId ?? undefined,
        qtyDemand: parseFloat(line.quantity) - parseFloat(line.receivedQuantity ?? 0),
        qtyDone: 0,
        unitCost: parseFloat(line.unitPrice),
      }));

    if (receiptLines.length === 0) {
      throw new BadRequestException(
        msg(
          ErrorMessages.PURCHASE_ORDER_WRONG_STATUS,
          order.orderNumber,
          'fully received',
          'has unreceived lines',
        ),
      );
    }

    // Delegate to ReceiptsService
    const receipt = await this.receiptsService.create(
      tenantId,
      {
        branchId: order.branchId,
        purchaseOrderId: id,
        partnerId: order.partnerId,
        scheduledDate: dto.scheduledDate,
        responsibleId: dto.responsibleId,
        notes: dto.notes,
        lines: receiptLines,
      },
      auditContext,
    );

    // Update PO receiptStatus to partial (will become received when receipt is validated)
    const currentReceiptStatus = order.receiptStatus ?? PurchaseOrderReceiptStatus.NOTHING;
    if (currentReceiptStatus === PurchaseOrderReceiptStatus.NOTHING) {
      await this.purchaseOrdersRepository.updateOrder(
        tenantId,
        id,
        ['"receiptStatus" = :receiptStatus', '"updatedBy" = :updatedBy', '"updatedAt" = NOW()'],
        {
          id,
          receiptStatus: PurchaseOrderReceiptStatus.PARTIAL,
          updatedBy: auditContext.userId || null,
        },
      );
    }

    return receipt;
  }

  // ── Create Bill (Confirmed → updates billStatus) ─────────────────────────

  async createBill(tenantId: string, id: string, dto: CreatePoBillDto, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    if (
      order.status !== PurchaseOrderStatus.CONFIRMED &&
      order.status !== PurchaseOrderStatus.DONE
    ) {
      throw new BadRequestException(
        msg(ErrorMessages.PURCHASE_ORDER_NOT_CONFIRMED, order.orderNumber),
      );
    }

    // Build invoice lines from PO lines — only lines with remaining qty to bill
    const poLines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, id);
    const billLines = poLines
      .filter((line: any) => {
        const qtyOrdered = parseFloat(line.quantity);
        const qtyBilled = parseFloat(line.qtyBilled ?? 0);
        return qtyOrdered > qtyBilled;
      })
      .map((line: any) => {
        const qtyToBill = parseFloat(line.quantity) - parseFloat(line.qtyBilled ?? 0);
        return {
          productId: line.productId ?? undefined,
          productVariantId: line.productVariantId ?? undefined,
          description: line.description || `PO ${order.orderNumber} line`,
          quantity: qtyToBill,
          unitPrice: parseFloat(line.unitPrice),
          discountPct: 0,
        };
      });

    if (billLines.length === 0) {
      throw new BadRequestException(
        msg(
          ErrorMessages.PURCHASE_ORDER_WRONG_STATUS,
          order.orderNumber,
          'fully billed',
          'has unbilled lines',
        ),
      );
    }

    // Delegate to InvoicesService with type=in_invoice
    const invoice = await this.invoicesService.create(
      tenantId,
      {
        branchId: order.branchId,
        partnerId: order.partnerId,
        invoiceType: InvoiceTypeNew.IN_INVOICE,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate,
        purchaseOrderId: id,
        currencyId: order.currencyId ?? undefined,
        exchangeRate: parseFloat(order.exchangeRate ?? 1),
        reference: dto.reference,
        journalId: dto.journalId,
        paymentTermId: order.paymentTermId ?? undefined,
        lines: billLines,
      },
      auditContext,
    );

    // Update qtyBilled on PO lines
    for (const line of poLines) {
      const qtyOrdered = parseFloat(line.quantity);
      const currentBilled = parseFloat(line.qtyBilled ?? 0);
      if (qtyOrdered > currentBilled) {
        await this.purchaseOrderLinesRepository.updateQtyBilled(
          tenantId,
          line.id.toString(),
          qtyOrdered, // Fully billed after this bill
        );
      }
    }

    // Update PO billStatus
    const allLines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, id);
    const allFullyBilled = allLines.every(
      (l: any) => parseFloat(l.qtyBilled) >= parseFloat(l.quantity),
    );

    const newBillStatus = allFullyBilled
      ? PurchaseOrderBillStatus.BILLED
      : PurchaseOrderBillStatus.TO_BILL;

    await this.purchaseOrdersRepository.updateOrder(
      tenantId,
      id,
      ['"billStatus" = :billStatus', '"updatedBy" = :updatedBy', '"updatedAt" = NOW()'],
      {
        id,
        billStatus: newBillStatus,
        updatedBy: auditContext.userId || null,
      },
    );

    // If both fully received and fully billed, mark as done
    await this.checkAndMarkDone(tenantId, id, auditContext);

    return invoice;
  }

  // ── Cancel ───────────────────────────────────────────────────────────────

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    // Only cancel if no receipts or bills exist
    const receiptStatus = order.receiptStatus ?? PurchaseOrderReceiptStatus.NOTHING;
    const billStatus = order.billStatus ?? PurchaseOrderBillStatus.NOTHING;

    if (receiptStatus !== PurchaseOrderReceiptStatus.NOTHING) {
      throw new BadRequestException(
        msg(ErrorMessages.PURCHASE_ORDER_HAS_RECEIPTS, order.orderNumber),
      );
    }

    if (billStatus !== PurchaseOrderBillStatus.NOTHING) {
      throw new BadRequestException(msg(ErrorMessages.PURCHASE_ORDER_HAS_BILLS, order.orderNumber));
    }

    const targetStatus = PurchaseOrderStatus.CANCELLED;
    this.statusTransitionService.validateOrThrow('purchase_order', order.status, targetStatus);

    await this.purchaseOrdersRepository.updateOrder(
      tenantId,
      id,
      ['status = :status', '"updatedBy" = :updatedBy', '"updatedAt" = NOW()'],
      { id, status: targetStatus, updatedBy: auditContext.userId || null },
    );

    await this.auditService.logStatusChange(
      tenantId,
      'purchasing.orders',
      id,
      order.status,
      targetStatus,
      auditContext.userId,
    );

    return this.findById(tenantId, id);
  }

  // ── Soft Delete (draft only) ─────────────────────────────────────────────

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, existing.orderNumber),
      );
    }

    await this.purchaseOrdersRepository.softDeleteOrder(tenantId, id, auditContext.userId || null);

    await this.auditService.logDelete(
      tenantId,
      'purchasing.orders',
      id,
      existing,
      auditContext.userId,
    );
  }

  // ── Line management ─────────────────────────────────────────────────────

  async addLine(
    tenantId: string,
    orderId: string,
    dto: CreatePurchaseOrderLineDto,
    auditContext: AuditContext,
  ) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, orderId);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', orderId));
    }
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, order.orderNumber));
    }

    const lineDiscount = dto.discountAmount ?? 0;
    const lineSubtotal = dto.quantity * dto.unitPrice;
    const taxableAmount = lineSubtotal - lineDiscount;
    const taxAmount = dto.taxRate ? taxableAmount * (dto.taxRate / 100) : 0;
    const lineTotal = lineSubtotal - lineDiscount + taxAmount;

    await this.purchaseOrderLinesRepository.insertLine(tenantId, {
      orderId,
      productId: dto.productId,
      productVariantId: dto.productVariantId ?? null,
      description: dto.description || '',
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      taxAmount,
      lineTotal,
      currencyId: order.currencyId ?? null,
      discountAmount: lineDiscount,
    });

    // Recalculate order totals
    await this.recalculateOrderTotals(tenantId, orderId, auditContext);

    return this.findById(tenantId, orderId);
  }

  async updateLine(
    tenantId: string,
    orderId: string,
    lineId: string,
    dto: CreatePurchaseOrderLineDto,
    auditContext: AuditContext,
  ) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, orderId);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', orderId));
    }
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, order.orderNumber));
    }

    const existingLine = await this.purchaseOrderLinesRepository.findOneByIdTenant(
      tenantId,
      lineId,
    );
    if (!existingLine || existingLine.orderId !== orderId) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order line', lineId));
    }

    const lineDiscount = dto.discountAmount ?? 0;
    const lineSubtotal = dto.quantity * dto.unitPrice;
    const taxableAmount = lineSubtotal - lineDiscount;
    const taxAmount = dto.taxRate ? taxableAmount * (dto.taxRate / 100) : 0;
    const lineTotal = lineSubtotal - lineDiscount + taxAmount;

    const sequelize = this.purchaseOrdersRepository.getSequelize();
    await sequelize.query(
      `UPDATE purchase_order_lines SET "productId" = :productId, "productVariantId" = :productVariantId, description = :description, quantity = :quantity, "unitPrice" = :unitPrice, "taxAmount" = :taxAmount, "lineTotal" = :lineTotal, "discountAmount" = :discountAmount, "updatedAt" = NOW() WHERE id = :lineId AND "tenantId" = :tenantId`,
      {
        replacements: {
          lineId,
          tenantId,
          productId: dto.productId,
          productVariantId: dto.productVariantId ?? null,
          description: dto.description || '',
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          taxAmount,
          lineTotal,
          discountAmount: lineDiscount,
        },
      } as any,
    );

    await this.recalculateOrderTotals(tenantId, orderId, auditContext);

    return this.findById(tenantId, orderId);
  }

  async removeLine(tenantId: string, orderId: string, lineId: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, orderId);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', orderId));
    }
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, order.orderNumber));
    }

    const existingLine = await this.purchaseOrderLinesRepository.findOneByIdTenant(
      tenantId,
      lineId,
    );
    if (!existingLine || existingLine.orderId !== orderId) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order line', lineId));
    }

    const sequelize = this.purchaseOrdersRepository.getSequelize();
    await sequelize.query(
      `DELETE FROM purchase_order_lines WHERE id = :lineId AND "tenantId" = :tenantId`,
      { replacements: { lineId, tenantId } } as any,
    );

    await this.recalculateOrderTotals(tenantId, orderId, auditContext);

    return this.findById(tenantId, orderId);
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private async validateSupplier(tenantId: string, partnerId: string): Promise<void> {
    const partner = await this.partnersRepository.findOneById(tenantId, partnerId);
    if (!partner) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Partner', partnerId));
    }
    if (!partner.isSupplier) {
      throw new BadRequestException(msg(ErrorMessages.PARTNER_NOT_SUPPLIER, partnerId));
    }
  }

  private async recalculateOrderTotals(
    tenantId: string,
    orderId: string,
    auditContext: AuditContext,
  ) {
    const lines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, orderId);

    let subtotal = 0;
    let totalTax = 0;
    let totalLineDiscount = 0;

    for (const line of lines) {
      subtotal +=
        parseFloat(line.lineTotal) +
        parseFloat(line.discountAmount || 0) -
        parseFloat(line.taxAmount || 0);
      totalTax += parseFloat(line.taxAmount || 0);
      totalLineDiscount += parseFloat(line.discountAmount || 0);
    }

    const totalAmount = subtotal - totalLineDiscount + totalTax;

    await this.purchaseOrdersRepository.updateOrder(
      tenantId,
      orderId,
      [
        'subtotal = :subtotal',
        '"taxAmount" = :taxAmount',
        '"totalAmount" = :totalAmount',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
      ],
      {
        id: orderId,
        subtotal,
        taxAmount: totalTax,
        totalAmount,
        updatedBy: auditContext.userId || null,
      },
    );
  }

  /**
   * If both fully received and fully billed, mark PO as done.
   */
  private async checkAndMarkDone(tenantId: string, orderId: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, orderId);
    if (!order || order.status === PurchaseOrderStatus.DONE) return;

    const receiptStatus = order.receiptStatus ?? PurchaseOrderReceiptStatus.NOTHING;
    const billStatus = order.billStatus ?? PurchaseOrderBillStatus.NOTHING;

    if (
      receiptStatus === PurchaseOrderReceiptStatus.RECEIVED &&
      billStatus === PurchaseOrderBillStatus.BILLED
    ) {
      await this.purchaseOrdersRepository.updateOrder(
        tenantId,
        orderId,
        ['status = :status', '"updatedBy" = :updatedBy', '"updatedAt" = NOW()'],
        {
          id: orderId,
          status: PurchaseOrderStatus.DONE,
          updatedBy: auditContext.userId || null,
        },
      );

      await this.auditService.logStatusChange(
        tenantId,
        'purchasing.orders',
        orderId,
        PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.DONE,
        auditContext.userId,
      );
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────

  async getSummaryReport(
    tenantId: string,
    query: PurchasingReportQueryDto,
  ): Promise<PurchasingSummary> {
    const sequelize = this.purchaseOrdersRepository.getSequelize();

    let dateFilter = '';
    const replacements: Record<string, unknown> = { tenantId };

    if (query.startDate) {
      dateFilter += ` AND po."createdAt" >= :startDate`;
      replacements.startDate = query.startDate;
    }
    if (query.endDate) {
      dateFilter += ` AND po."createdAt" <= :endDate`;
      replacements.endDate = query.endDate;
    }
    if (query.partnerId) {
      dateFilter += ` AND po."partnerId" = :partnerId`;
      replacements.partnerId = query.partnerId;
    }
    if (query.branchId) {
      dateFilter += ` AND po."branchId" = :branchId`;
      replacements.branchId = query.branchId;
    }

    // Total orders, total spend, avg
    const [summaryRows] = await sequelize.query(
      `SELECT
         COUNT(*)::int AS "totalOrders",
         COALESCE(SUM(COALESCE(po."totalAmountBase", po."totalAmount")), 0)::numeric(15,2) AS "totalSpend",
         COALESCE(AVG(COALESCE(po."totalAmountBase", po."totalAmount")), 0)::numeric(15,2) AS "averageOrderValue"
       FROM purchase_orders po
       WHERE po."tenantId" = :tenantId AND po."deletedAt" IS NULL ${dateFilter}`,
      { replacements },
    );
    const summary = (summaryRows as any[])[0] ?? {
      totalOrders: 0,
      totalSpend: 0,
      averageOrderValue: 0,
    };

    // By status
    const [byStatusRows] = await sequelize.query(
      `SELECT
         po.status,
         COUNT(*)::int AS count,
         COALESCE(SUM(COALESCE(po."totalAmountBase", po."totalAmount")), 0)::numeric(15,2) AS total
       FROM purchase_orders po
       WHERE po."tenantId" = :tenantId AND po."deletedAt" IS NULL ${dateFilter}
       GROUP BY po.status
       ORDER BY count DESC`,
      { replacements },
    );

    // By partner (supplier)
    const [byPartnerRows] = await sequelize.query(
      `SELECT
         po."partnerId",
         COALESCE(p."nameEn", '') AS "nameEn",
         COALESCE(p."nameAr", '') AS "nameAr",
         COUNT(*)::int AS count,
         COALESCE(SUM(COALESCE(po."totalAmountBase", po."totalAmount")), 0)::numeric(15,2) AS total
       FROM purchase_orders po
       LEFT JOIN partners p ON p.id = po."partnerId"
       WHERE po."tenantId" = :tenantId AND po."deletedAt" IS NULL ${dateFilter}
       GROUP BY po."partnerId", p."nameEn", p."nameAr"
       ORDER BY total DESC`,
      { replacements },
    );

    // By currency
    const [byCurrencyRows] = await sequelize.query(
      `SELECT
         COALESCE(po."currencyId", 'base') AS "currencyId",
         COUNT(*)::int AS count,
         COALESCE(SUM(COALESCE(po."totalAmountBase", po."totalAmount")), 0)::numeric(15,2) AS "totalBase"
       FROM purchase_orders po
       WHERE po."tenantId" = :tenantId AND po."deletedAt" IS NULL ${dateFilter}
       GROUP BY po."currencyId"
       ORDER BY "totalBase" DESC`,
      { replacements },
    );

    return {
      totalOrders: parseInt(summary.totalOrders, 10),
      totalSpend: parseFloat(summary.totalSpend),
      averageOrderValue: parseFloat(summary.averageOrderValue),
      byStatus: byStatusRows as any[],
      byPartner: byPartnerRows as any[],
      byCurrency: byCurrencyRows as any[],
    };
  }
}
