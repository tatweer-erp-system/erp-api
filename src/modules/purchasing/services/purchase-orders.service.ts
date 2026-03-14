import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PurchaseOrderStatus } from '@/common/enums/purchasing.enums';
import { ProductType } from '@/common/enums/pos.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { PurchaseOrdersRepository } from '@/database/sql/repositories/purchase-orders.repository';
import { PurchaseOrderLinesRepository } from '@/database/sql/repositories/purchase-order-lines.repository';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { ReceiveItemsDto } from '../dto/receive-items.dto';
import { CreatePurchaseOrderLineDto } from '../dto/create-purchase-order-line.dto';
import { PurchasingReportQueryDto } from '../dto/purchasing-report-query.dto';
import { InvoicePurchaseOrderDto } from '../dto/invoice-purchase-order.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PurchasingSummary } from '../interfaces/purchasing.interface';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly purchaseOrderLinesRepository: PurchaseOrderLinesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly warehousesRepository: WarehousesRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly journalPosterSharedService: JournalPosterSharedService,
    private readonly inventoryService: InventorySharedService,
    private readonly sequencesService: SequencesService,
    private readonly currencyService: CurrencyService,
  ) {
    // Register purchase_order status transitions
    this.statusTransitionService.registerTransitions('purchase_order', [
      { from: PurchaseOrderStatus.DRAFT, to: PurchaseOrderStatus.SENT },
      { from: PurchaseOrderStatus.SENT, to: PurchaseOrderStatus.CONFIRMED },
      { from: PurchaseOrderStatus.CONFIRMED, to: PurchaseOrderStatus.RECEIVED },
      { from: PurchaseOrderStatus.RECEIVED, to: PurchaseOrderStatus.INVOICED },
      {
        from: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT],
        to: PurchaseOrderStatus.CANCELLED,
      },
    ]);
  }

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

  async findById(tenantId: string, id: string) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }
    const lines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, id);
    return { ...order, lines };
  }

  async create(tenantId: string, dto: CreatePurchaseOrderDto, auditContext: AuditContext) {
    // Strip orderNumber from input — always generate via sequence
    const { ...safeDto } = dto;

    // Generate order number via sequences service
    const orderNumber = await this.sequencesService.nextNumber(
      tenantId,
      'purchase_order',
      safeDto.branchId,
    );

    // Resolve currency
    const currencyId = safeDto.currencyId ?? null;
    let currencyCode = 'SAR';
    if (currencyId) {
      const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
      currencyCode = baseCurrency.id === currencyId ? baseCurrency.code : currencyCode;
    }

    const orderDiscountAmount = safeDto.discountAmount ?? 0;
    let subtotal = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;

    const lineData = safeDto.lines.map((line) => {
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
      vendorId: safeDto.vendorId,
      branchId: safeDto.branchId ?? null,
      subtotal,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      currency: currencyCode,
      currencyId,
      discountAmount: totalDiscount,
      status: PurchaseOrderStatus.DRAFT,
      expectedDeliveryDate: safeDto.expectedDeliveryDate || null,
      notes: safeDto.notes || null,
      createdBy: auditContext.userId || null,
    });

    for (const line of lineData) {
      await this.purchaseOrderLinesRepository.insertLine(tenantId, {
        orderId,
        productId: line.productId,
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

    const updates: string[] = ['version = version + 1'];
    const replacements: Record<string, unknown> = { id };

    if (dto.vendorId !== undefined) {
      updates.push('"vendorId" = :vendorId');
      replacements.vendorId = dto.vendorId;
    }
    if (dto.currencyId !== undefined) {
      updates.push('"currencyId" = :currencyId');
      replacements.currencyId = dto.currencyId;
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

  async send(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    const targetStatus = PurchaseOrderStatus.SENT;
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

  async confirm(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    const targetStatus = PurchaseOrderStatus.CONFIRMED;
    this.statusTransitionService.validateOrThrow('purchase_order', order.status, targetStatus);

    // Lock exchange rate at confirmation
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
        await this.purchaseOrderLinesRepository.updateReceivedQuantity(
          tenantId,
          line.id,
          parseFloat(line.receivedQuantity),
        );
        // Update lineTotalBase via raw query
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

  async receive(tenantId: string, id: string, dto: ReceiveItemsDto, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    if (order.status !== PurchaseOrderStatus.CONFIRMED) {
      this.statusTransitionService.validateOrThrow(
        'purchase_order',
        order.status,
        PurchaseOrderStatus.RECEIVED,
      );
    }

    // Resolve warehouse: use DTO value or fall back to default warehouse
    let resolvedWarehouseId = dto.warehouseId ?? null;
    if (!resolvedWarehouseId) {
      const defaultWarehouse = await this.warehousesRepository.findDefault(tenantId);
      if (defaultWarehouse) {
        resolvedWarehouseId = defaultWarehouse.id as string;
      }
    }

    const sequelize = this.purchaseOrdersRepository.getSequelize();
    const transaction = await sequelize.transaction();

    try {
      const receivedLines: Array<{
        lineId: string;
        productId: string;
        receivedQuantity: number;
      }> = [];

      for (const receiveLine of dto.lines) {
        const line = await this.purchaseOrderLinesRepository.findOneByIdTenant(
          tenantId,
          receiveLine.lineId,
        );

        if (!line || line.orderId !== id) {
          throw new BadRequestException(
            msg(ErrorMessages.NOT_FOUND, 'Purchase order line', receiveLine.lineId),
          );
        }

        // Update receivedQuantity on the line (accumulate) — inside transaction
        const newReceivedQuantity =
          parseFloat(line.receivedQuantity || 0) + receiveLine.receivedQuantity;

        await sequelize.query(
          `UPDATE purchase_order_lines
           SET "receivedQuantity" = :qty, "updatedAt" = NOW()
           WHERE id = :lineId AND "tenantId" = :tenantId`,
          {
            replacements: { qty: newReceivedQuantity, lineId: receiveLine.lineId, tenantId },
            transaction,
          } as any,
        );

        receivedLines.push({
          lineId: receiveLine.lineId,
          productId: line.productId,
          receivedQuantity: receiveLine.receivedQuantity,
        });

        // Create stock movement for storable products
        const product = await this.productsRepository.findById(tenantId, line.productId);
        if (product && product.productType === ProductType.STORABLE && resolvedWarehouseId) {
          await this.inventoryService.createMovement(
            tenantId,
            {
              movementType: StockMovementType.PURCHASE_RECEIPT,
              productId: line.productId,
              warehouseId: resolvedWarehouseId,
              quantity: receiveLine.receivedQuantity,
              unitCost: parseFloat(String(line.unitPrice)),
              referenceId: id,
              referenceType: StockReferenceType.PURCHASE_ORDER,
            } as any,
            transaction,
          );
        }
      }

      // Check if all lines are fully received — query inside transaction for consistency
      const allLinesResult = await sequelize.query(
        `SELECT quantity, "receivedQuantity" FROM purchase_order_lines
         WHERE "orderId" = :orderId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
        { replacements: { orderId: id, tenantId }, transaction },
      );
      const allLinesRows = (allLinesResult as any)[0] as any[];
      const allFullyReceived = allLinesRows.every(
        (line: any) => parseFloat(line.receivedQuantity) >= parseFloat(line.quantity),
      );

      // Update order status to RECEIVED — inside transaction
      let statusSql = `UPDATE purchase_orders
        SET status = :status, "updatedBy" = :updatedBy, "updatedAt" = NOW()`;
      if (allFullyReceived) {
        statusSql += `, "receivedAt" = NOW()`;
      }
      statusSql += ` WHERE id = :id AND "tenantId" = :tenantId`;

      await sequelize.query(statusSql, {
        replacements: {
          id,
          tenantId,
          status: PurchaseOrderStatus.RECEIVED,
          updatedBy: auditContext.userId || null,
        },
        transaction,
      } as any);

      // Create outbox event for purchase_order.received
      await this.outboxService.createEvent(
        transaction,
        tenantId,
        'purchase_order.received',
        {
          orderId: id,
          orderNumber: order.orderNumber,
          lines: receivedLines,
          warehouseId: resolvedWarehouseId,
          fullyReceived: allFullyReceived,
        },
        id,
        'purchase_order',
      );

      await transaction.commit();

      await this.auditService.logStatusChange(
        tenantId,
        'purchasing.orders',
        id,
        order.status,
        PurchaseOrderStatus.RECEIVED,
        auditContext.userId,
      );

      return this.findById(tenantId, id);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async invoice(
    tenantId: string,
    id: string,
    dto: InvoicePurchaseOrderDto,
    auditContext: AuditContext,
  ) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.PURCHASE_ORDER_NOT_FOUND, id));
    }

    if (order.status !== PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException(
        msg(
          ErrorMessages.PURCHASE_ORDER_WRONG_STATUS,
          order.orderNumber,
          order.status,
          PurchaseOrderStatus.RECEIVED,
        ),
      );
    }

    // Read COA settings
    const coaInventorySetting = await this.tenantSettingsRepository.findByKeyTenant(
      tenantId,
      'coaInventory',
    );
    if (!coaInventorySetting?.value) {
      throw new BadRequestException(msg(ErrorMessages.ACCOUNTING_SETTING_MISSING, 'coaInventory'));
    }
    const coaInventory = coaInventorySetting.value as string;

    const coaApSetting = await this.tenantSettingsRepository.findByKeyTenant(
      tenantId,
      'coaAccountsPayable',
    );
    if (!coaApSetting?.value) {
      throw new BadRequestException(
        msg(ErrorMessages.ACCOUNTING_SETTING_MISSING, 'coaAccountsPayable'),
      );
    }
    const coaAccountsPayable = coaApSetting.value as string;

    // Calculate net amount (total minus tax — Saudi VAT on purchases is recoverable input tax)
    const totalAmount = parseFloat(order.totalAmountBase ?? order.totalAmount);
    const taxAmount = parseFloat(order.taxAmount ?? 0);
    const exchangeRate = parseFloat(order.exchangeRate ?? 1);
    const netAmount = totalAmount - taxAmount * exchangeRate;

    // Post journal entry: DR Inventory, CR Accounts Payable
    await this.journalPosterSharedService.post(
      tenantId,
      {
        entryDate: dto.invoiceDate,
        description: `Vendor invoice ${dto.invoiceNumber} for PO ${order.orderNumber}`,
        referenceId: id,
        referenceType: 'purchase_order',
        lines: [
          {
            accountId: coaInventory,
            debit: netAmount,
            credit: 0,
          },
          {
            accountId: coaAccountsPayable,
            debit: 0,
            credit: netAmount,
          },
        ],
      },
      auditContext,
    );

    // Update order status to INVOICED and store invoice number
    const targetStatus = PurchaseOrderStatus.INVOICED;
    this.statusTransitionService.validateOrThrow('purchase_order', order.status, targetStatus);

    await this.purchaseOrdersRepository.updateOrder(
      tenantId,
      id,
      [
        'status = :status',
        '"invoiceNumber" = :invoiceNumber',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
      ],
      {
        id,
        status: targetStatus,
        invoiceNumber: dto.invoiceNumber,
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

    return this.findById(tenantId, id);
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    if (!order) {
      throw new BadRequestException(msg(ErrorMessages.NOT_FOUND, 'Purchase order', id));
    }

    const targetStatus = PurchaseOrderStatus.CANCELLED;

    // CANCELLED only from DRAFT or SENT
    if (order.status !== PurchaseOrderStatus.DRAFT && order.status !== PurchaseOrderStatus.SENT) {
      throw new BadRequestException(
        msg(ErrorMessages.ORDER_NOT_CANCELLABLE, order.orderNumber, order.status),
      );
    }

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

    const lineId = await this.purchaseOrderLinesRepository.insertLine(tenantId, {
      orderId,
      productId: dto.productId,
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
      `UPDATE purchase_order_lines SET "productId" = :productId, description = :description, quantity = :quantity, "unitPrice" = :unitPrice, "taxAmount" = :taxAmount, "lineTotal" = :lineTotal, "discountAmount" = :discountAmount, "updatedAt" = NOW() WHERE id = :lineId AND "tenantId" = :tenantId`,
      {
        replacements: {
          lineId,
          tenantId,
          productId: dto.productId,
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
    if (query.vendorId) {
      dateFilter += ` AND po."vendorId" = :vendorId`;
      replacements.vendorId = query.vendorId;
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

    // By vendor
    const [byVendorRows] = await sequelize.query(
      `SELECT
         po."vendorId",
         COALESCE(v."nameEn", '') AS "nameEn",
         COALESCE(v."nameAr", '') AS "nameAr",
         COUNT(*)::int AS count,
         COALESCE(SUM(COALESCE(po."totalAmountBase", po."totalAmount")), 0)::numeric(15,2) AS total
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po."vendorId"
       WHERE po."tenantId" = :tenantId AND po."deletedAt" IS NULL ${dateFilter}
       GROUP BY po."vendorId", v."nameEn", v."nameAr"
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
      byVendor: byVendorRows as any[],
      byCurrency: byCurrencyRows as any[],
    };
  }
}
