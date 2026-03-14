import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SalesOrderLinesRepository } from '@/database/sql/repositories/sales-order-lines.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import {
  JournalPosterSharedService,
  GenericJournalPostData,
} from '@/shared/services/journal-poster-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { ZatcaSharedService } from '@/shared/services/zatca-shared.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { CreateSalesOrderLineDto } from '../dto/create-sales-order-line.dto';
import { UpdateSalesOrderLineDto } from '../dto/update-sales-order-line.dto';
import { SalesReportQueryDto } from '../dto/sales-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  SalesOrderStatus,
  ZatcaTransactionType,
  ZatcaInvoiceType,
  ZatcaStatus,
  ZatcaTaxCategory,
  SupplyType,
  SalesDiscountType,
} from '@/common/enums/crm.enums';
import { ProductType } from '@/common/enums/pos.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { SequenceEntity } from '@/common/enums/sequence.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import {
  SalesOrderLineCalculation,
  SalesOrderCalculationResult,
  SalesReportSummary,
} from '../interfaces/sales.interfaces';

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly salesOrderLinesRepository: SalesOrderLinesRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly journalPosterSharedService: JournalPosterSharedService,
    private readonly sequencesService: SequencesService,
    private readonly currencyService: CurrencyService,
    private readonly inventoryService: InventorySharedService,
    private readonly zatcaSharedService: ZatcaSharedService,
  ) {}

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
    if (!order) throw new NotFoundException(msg(ErrorMessages.ORDER_NOT_FOUND, id));

    const lines = await this.salesOrderLinesRepository.findLinesByOrderId(tenantId, id);
    return { ...order, lines };
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateSalesOrderDto, auditContext: AuditContext) {
    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      // Resolve currency — default to tenant base currency
      let currencyId = dto.currencyId;
      if (!currencyId) {
        const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
        currencyId = baseCurrency.id;
      }

      // Validate credit/debit note references
      if (
        (dto.transactionType === ZatcaTransactionType.CREDIT_NOTE ||
          dto.transactionType === ZatcaTransactionType.DEBIT_NOTE) &&
        !dto.originalInvoiceId
      ) {
        throw new BadRequestException(`originalInvoiceId is required for ${dto.transactionType}`);
      }

      if (dto.originalInvoiceId) {
        const exists = await this.salesOrdersRepository.findOriginalInvoice(
          tenantId,
          dto.originalInvoiceId,
          transaction,
        );
        if (!exists) {
          throw new NotFoundException('Original invoice not found');
        }
      }

      const id = uuidv4();

      // Generate order number via sequences service
      const orderNumber = await this.sequencesService.nextNumber(
        tenantId,
        SequenceEntity.SALES_ORDER,
        dto.branchId,
      );

      // Generate ZATCA UUID and counter
      const zatcaUUID = uuidv4();
      const zatcaInvoiceCounter = parseInt(
        (await this.sequencesService.nextNumber(tenantId, SequenceEntity.ZATCA_INVOICE)).replace(
          /\D/g,
          '',
        ),
        10,
      );

      // Calculate line totals
      const lineCalculations = this.calculateLines(
        dto.lines,
        dto.discountType as SalesDiscountType | undefined,
        dto.discountValue,
      );

      // ZATCA defaults
      const invoiceType = dto.invoiceType ?? ZatcaInvoiceType.SIMPLIFIED;
      const transactionType = dto.transactionType ?? ZatcaTransactionType.SALE;
      const supplyType = dto.supplyType ?? SupplyType.GOODS;
      const taxCategory = dto.taxCategory ?? ZatcaTaxCategory.S;

      // Insert order
      await this.salesOrdersRepository.insertOrder(
        tenantId,
        {
          id,
          orderNumber,
          contactId: dto.contactId,
          subtotal: lineCalculations.subtotal,
          discountAmount: lineCalculations.totalDiscount,
          taxAmount: lineCalculations.totalTax,
          totalAmount: lineCalculations.grandTotal,
          notes: dto.notes ?? null,
          invoiceType,
          transactionType,
          supplyType,
          taxCategory,
          taxExemptionCode: dto.taxExemptionCode ?? null,
          taxExemptionReason: dto.taxExemptionReason ?? null,
          originalInvoiceId: dto.originalInvoiceId ?? null,
          zatcaUUID,
          zatcaInvoiceCounter,
          createdBy: auditContext.userId ?? null,
        },
        transaction,
      );

      // Set new currency fields on the order
      await this.salesOrdersRepository.updateOrder(
        tenantId,
        id,
        [
          '"currencyId" = :currencyId',
          '"exchangeRate" = :exchangeRate',
          '"totalAmountBase" = :totalAmountBase',
          '"discountType" = :discountType',
          '"discountValue" = :discountValue',
          '"zatcaStatus" = :zatcaStatus',
        ],
        {
          id,
          currencyId,
          exchangeRate: 1,
          totalAmountBase: lineCalculations.grandTotal,
          discountType: dto.discountType ?? null,
          discountValue: dto.discountValue ?? null,
          zatcaStatus: ZatcaStatus.PENDING,
        },
        transaction,
      );

      // Insert lines
      for (const lineCalc of lineCalculations.lines) {
        await this.salesOrderLinesRepository.insertLine(
          tenantId,
          {
            orderId: id,
            productId: lineCalc.productId,
            description: lineCalc.description ?? '',
            quantity: lineCalc.quantity,
            unitPrice: lineCalc.unitPrice,
            discountAmount: lineCalc.discountAmount,
            taxRate: lineCalc.taxRate,
            taxAmount: lineCalc.taxAmount,
            lineTotal: lineCalc.lineTotal,
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
          contactId: dto.contactId,
          totalAmount: lineCalculations.grandTotal,
          currencyId,
        },
        transaction,
      });

      await transaction.commit();
      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Update (draft only) ─────────────────────────────────────────────────────

  async update(tenantId: string, id: string, dto: UpdateSalesOrderDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, existing.orderNumber),
      );
    }

    // Optimistic locking check
    if (existing.version !== undefined && existing.version !== dto.version) {
      throw new ConflictException(msg(ErrorMessages.ORDER_VERSION_CONFLICT));
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

      if (dto.contactId !== undefined) {
        updates.push('"contactId" = :contactId');
        replacements.contactId = dto.contactId;
      }
      if (dto.supplyType !== undefined) {
        updates.push('"supplyType" = :supplyType');
        replacements.supplyType = dto.supplyType;
      }
      if (dto.taxCategory !== undefined) {
        updates.push('"taxCategory" = :taxCategory');
        replacements.taxCategory = dto.taxCategory;
      }
      if (dto.taxExemptionCode !== undefined) {
        updates.push('"taxExemptionCode" = :taxExemptionCode');
        replacements.taxExemptionCode = dto.taxExemptionCode;
      }
      if (dto.taxExemptionReason !== undefined) {
        updates.push('"taxExemptionReason" = :taxExemptionReason');
        replacements.taxExemptionReason = dto.taxExemptionReason;
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

  // ── Status transitions ──────────────────────────────────────────────────────

  async confirm(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, id);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, order.orderNumber));
    }

    this.statusTransitionService.validateOrThrow('order', order.status, SalesOrderStatus.CONFIRMED);

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      // Lock exchange rate at confirmation
      let exchangeRate = 1;
      let totalAmountBase = parseFloat(String(order.totalAmount));
      const currencyId = order.currencyId as string | null;

      if (currencyId) {
        const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
        exchangeRate = await this.currencyService.getRate(tenantId, currencyId, baseCurrency.id);
        totalAmountBase = this.currencyService.convert(
          parseFloat(String(order.totalAmount)),
          exchangeRate,
        );
      }

      // Reserve stock for storable products
      const warehouseId = await this.resolveWarehouseId(tenantId);
      const lines = (order.lines ?? []) as Record<string, unknown>[];

      for (const line of lines) {
        const productId = line.productId as string;
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

      await this.salesOrdersRepository.updateOrder(
        tenantId,
        id,
        [
          'status = :status',
          '"updatedBy" = :updatedBy',
          '"updatedAt" = NOW()',
          '"exchangeRate" = :exchangeRate',
          '"totalAmountBase" = :totalAmountBase',
          'version = version + 1',
        ],
        {
          id,
          status: SalesOrderStatus.CONFIRMED,
          updatedBy: auditContext.userId ?? null,
          exchangeRate,
          totalAmountBase,
        },
        transaction,
      );

      // Update line base amounts
      if (order.lines && Array.isArray(order.lines)) {
        for (const line of order.lines) {
          const lineRecord = line as Record<string, unknown>;
          const lineTotal = parseFloat(String(lineRecord.lineTotal ?? 0));
          const lineTotalBase = this.currencyService.convert(lineTotal, exchangeRate);
          const lineId = lineRecord.id as string;

          const lineSequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
          await lineSequelize.query(
            `UPDATE sales_order_lines SET "lineTotalBase" = :lineTotalBase, "currencyId" = :currencyId WHERE id = :lineId AND "tenantId" = :tenantId`,
            {
              replacements: { lineTotalBase, currencyId, lineId, tenantId },
              transaction,
            } as any,
          );
        }
      }

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'sales_order.confirmed',
        payload: {
          orderId: id,
          orderNumber: order.orderNumber,
          contactId: order.contactId,
          totalAmount: order.totalAmount,
          totalAmountBase,
          exchangeRate,
          currencyId,
          lines: order.lines ?? [],
        },
        transaction,
      });

      await transaction.commit();
      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, id);

    // CANCELLED only from DRAFT or CONFIRMED (never from INVOICED)
    if (order.status !== SalesOrderStatus.DRAFT && order.status !== SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException(
        msg(ErrorMessages.ORDER_NOT_CANCELLABLE, order.orderNumber, order.status),
      );
    }

    this.statusTransitionService.validateOrThrow('order', order.status, SalesOrderStatus.CANCELLED);

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      // Release reservations if order was confirmed
      if (order.status === SalesOrderStatus.CONFIRMED) {
        const warehouseId = await this.resolveWarehouseId(tenantId);
        const lines = (order.lines ?? []) as Record<string, unknown>[];

        for (const line of lines) {
          const productId = line.productId as string;
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
      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Deliver ────────────────────────────────────────────────────────────────

  async deliver(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, id);

    if (order.status !== SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException(
        msg(
          ErrorMessages.SALES_ORDER_WRONG_STATUS,
          order.orderNumber,
          order.status,
          SalesOrderStatus.CONFIRMED,
        ),
      );
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const warehouseId = await this.resolveWarehouseId(tenantId);
      const lines = (order.lines ?? []) as Record<string, unknown>[];
      let totalCogs = 0;

      for (const line of lines) {
        const productId = line.productId as string;
        const product = await this.productsRepository.findById(tenantId, productId);
        if (!product || product.productType !== ProductType.STORABLE) continue;

        const quantity = parseFloat(String(line.quantity));

        // Get current average cost before creating movement
        const stockLevels = await this.inventoryService.getStockLevel(
          tenantId,
          productId,
          warehouseId,
        );
        const averageCost =
          stockLevels.length > 0 ? parseFloat(String(stockLevels[0].averageCost ?? 0)) : 0;

        // Create SALE_DELIVERY movement
        const movementResult = await this.inventoryService.createMovement(
          tenantId,
          {
            productId,
            warehouseId,
            movementType: StockMovementType.SALE_DELIVERY,
            quantity,
            unitCost: averageCost,
            referenceId: id,
            referenceType: StockReferenceType.SALES_ORDER,
          },
          transaction,
        );

        totalCogs += movementResult.totalCost;

        // Release reservation
        await this.inventoryService.releaseReservation(
          tenantId,
          productId,
          warehouseId,
          quantity,
          transaction,
        );
      }

      // Post COGS journal entry if there is any cost
      if (totalCogs > 0) {
        const coaCogs = await this.requireSetting(tenantId, 'coaCogs');
        const coaInventory = await this.requireSetting(tenantId, 'coaInventory');

        const journalData: GenericJournalPostData = {
          entryDate: new Date().toISOString().split('T')[0],
          description: `COGS for Sales Order ${order.orderNumber}`,
          referenceId: id,
          referenceType: 'sales_order',
          lines: [
            { accountId: coaCogs, debit: Math.round(totalCogs * 100) / 100, credit: 0 },
            { accountId: coaInventory, debit: 0, credit: Math.round(totalCogs * 100) / 100 },
          ],
        };

        await this.journalPosterSharedService.post(
          tenantId,
          journalData,
          auditContext,
          transaction,
        );
      }

      // Update status to DELIVERED
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
          status: SalesOrderStatus.DELIVERED,
          updatedBy: auditContext.userId ?? null,
        },
        transaction,
      );

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'sales_order.delivered',
        payload: {
          orderId: id,
          orderNumber: order.orderNumber,
          totalCogs: Math.round(totalCogs * 100) / 100,
        },
        transaction,
      });

      await transaction.commit();
      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Invoice ───────────────────────────────────────────────────────────────

  async invoice(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, id);

    if (order.status !== SalesOrderStatus.DELIVERED) {
      throw new BadRequestException(
        msg(
          ErrorMessages.SALES_ORDER_WRONG_STATUS,
          order.orderNumber,
          order.status,
          SalesOrderStatus.DELIVERED,
        ),
      );
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const totalAmountBase = parseFloat(String(order.totalAmountBase ?? order.totalAmount));
      const exchangeRate = parseFloat(String(order.exchangeRate ?? 1));
      const taxAmount = parseFloat(String(order.taxAmount ?? 0));
      const taxAmountBase = this.currencyService.convert(taxAmount, exchangeRate);
      const revenueAmount = totalAmountBase - taxAmountBase;

      // Resolve COA accounts
      const coaAR = await this.requireSetting(tenantId, 'coaAccountsReceivable');
      const coaSalesRevenue = await this.requireSetting(tenantId, 'coaSalesRevenue');
      const coaVatPayable = await this.requireSetting(tenantId, 'coaVatPayable');

      const journalLines: GenericJournalPostData['lines'] = [
        { accountId: coaAR, debit: totalAmountBase, credit: 0 },
        { accountId: coaSalesRevenue, debit: 0, credit: Math.round(revenueAmount * 100) / 100 },
      ];

      if (taxAmountBase > 0) {
        journalLines.push({
          accountId: coaVatPayable,
          debit: 0,
          credit: Math.round(taxAmountBase * 100) / 100,
        });
      }

      const journalData: GenericJournalPostData = {
        entryDate: new Date().toISOString().split('T')[0],
        description: `Revenue for Sales Order ${order.orderNumber}`,
        referenceId: id,
        referenceType: 'sales_order',
        lines: journalLines,
      };

      await this.journalPosterSharedService.post(tenantId, journalData, auditContext, transaction);

      // Update status to INVOICED and set zatcaStatus to PENDING
      await this.salesOrdersRepository.updateOrder(
        tenantId,
        id,
        [
          'status = :status',
          '"zatcaStatus" = :zatcaStatus',
          '"updatedBy" = :updatedBy',
          '"updatedAt" = NOW()',
          'version = version + 1',
        ],
        {
          id,
          status: SalesOrderStatus.INVOICED,
          zatcaStatus: ZatcaStatus.PENDING,
          updatedBy: auditContext.userId ?? null,
        },
        transaction,
      );

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'sales_order.invoiced',
        payload: {
          orderId: id,
          orderNumber: order.orderNumber,
          totalAmountBase,
          taxAmountBase: Math.round(taxAmountBase * 100) / 100,
        },
        transaction,
      });

      await transaction.commit();

      // Submit to ZATCA (post-commit, best-effort)
      try {
        await this.zatcaSharedService.issueInvoice(tenantId, id);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`ZATCA submission failed for order ${id}: ${errMsg}`);
      }

      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Line management ─────────────────────────────────────────────────────────

  async addLine(
    tenantId: string,
    orderId: string,
    dto: CreateSalesOrderLineDto,
    auditContext: AuditContext,
  ) {
    const order = await this.findById(tenantId, orderId);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, order.orderNumber));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const lineCalc = this.calculateSingleLine(dto);

      await this.salesOrderLinesRepository.insertLine(
        tenantId,
        {
          orderId,
          productId: dto.productId,
          description: dto.description ?? '',
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          discountAmount: lineCalc.discountAmount,
          taxRate: lineCalc.taxRate,
          taxAmount: lineCalc.taxAmount,
          lineTotal: lineCalc.lineTotal,
        },
        transaction,
      );

      // Recalculate order totals
      await this.recalculateOrderTotals(tenantId, orderId, order, auditContext, transaction);

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
    const order = await this.findById(tenantId, orderId);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, order.orderNumber));
    }

    // Find the line
    const existingLine = (order.lines as Record<string, unknown>[])?.find(
      (l) => String(l.id) === lineId,
    );
    if (!existingLine) {
      throw new NotFoundException(`Line ${lineId} not found on order ${orderId}`);
    }

    // Optimistic locking
    if (existingLine.version !== undefined && existingLine.version !== dto.version) {
      throw new ConflictException(msg(ErrorMessages.ORDER_VERSION_CONFLICT));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const updates: string[] = ['"updatedAt" = NOW()', 'version = version + 1'];
      const replacements: Record<string, unknown> = { lineId, tenantId };

      if (dto.quantity !== undefined) {
        updates.push('quantity = :quantity');
        replacements.quantity = dto.quantity;
      }
      if (dto.unitPrice !== undefined) {
        updates.push('"unitPrice" = :unitPrice');
        replacements.unitPrice = dto.unitPrice;
      }
      if (dto.discountType !== undefined) {
        updates.push('"discountType" = :discountType');
        replacements.discountType = dto.discountType;
      }
      if (dto.discountValue !== undefined) {
        updates.push('"discountValue" = :discountValue');
        replacements.discountValue = dto.discountValue;
      }
      if (dto.taxRate !== undefined) {
        updates.push('"taxRate" = :taxRate');
        replacements.taxRate = dto.taxRate;
      }
      if (dto.description !== undefined) {
        updates.push('description = :description');
        replacements.description = dto.description;
      }

      // Recalculate line amounts
      const quantity = dto.quantity ?? (existingLine.quantity as number);
      const unitPrice = dto.unitPrice ?? (existingLine.unitPrice as number);
      const taxRate = dto.taxRate ?? (existingLine.taxRate as number);
      const discountType = dto.discountType ?? (existingLine.discountType as string | undefined);
      const discountValue = dto.discountValue ?? (existingLine.discountValue as number | undefined);

      const lineGross = quantity * unitPrice;
      let lineDiscount = 0;
      if (discountType && discountValue) {
        if (discountType === SalesDiscountType.PERCENTAGE) {
          lineDiscount = lineGross * (discountValue / 100);
        } else {
          lineDiscount = discountValue;
        }
      }
      const lineAfterDiscount = lineGross - lineDiscount;
      const lineTax = lineAfterDiscount * (taxRate / 100);
      const lineTotal = lineAfterDiscount + lineTax;

      updates.push('"discountAmount" = :discountAmount');
      updates.push('"taxAmount" = :taxAmount');
      updates.push('"lineTotal" = :lineTotal');
      replacements.discountAmount = Math.round(lineDiscount * 100) / 100;
      replacements.taxAmount = Math.round(lineTax * 100) / 100;
      replacements.lineTotal = Math.round(lineTotal * 100) / 100;

      const seqInstance = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
      await seqInstance.query(
        `UPDATE sales_order_lines SET ${updates.join(', ')} WHERE id = :lineId AND "tenantId" = :tenantId`,
        { replacements, transaction } as any,
      );

      // Recalculate order totals
      await this.recalculateOrderTotals(tenantId, orderId, order, auditContext, transaction);

      await transaction.commit();
      return this.findById(tenantId, orderId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async removeLine(tenantId: string, orderId: string, lineId: string, auditContext: AuditContext) {
    const order = await this.findById(tenantId, orderId);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_ALREADY_CONFIRMED, order.orderNumber));
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      await sequelize.query(
        `DELETE FROM sales_order_lines WHERE id = :lineId AND "orderId" = :orderId AND "tenantId" = :tenantId`,
        { replacements: { lineId, orderId, tenantId }, transaction } as any,
      );

      // Recalculate order totals
      await this.recalculateOrderTotals(tenantId, orderId, order, auditContext, transaction);

      await transaction.commit();
      return this.findById(tenantId, orderId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Sales summary report ────────────────────────────────────────────────────

  async getSalesSummary(tenantId: string, query: SalesReportQueryDto): Promise<SalesReportSummary> {
    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);

    const dateFilter = this.buildDateFilter(query);
    const branchFilter = query.branchId ? 'AND so."branchId" = :branchId' : '';
    const replacements: Record<string, unknown> = { tenantId };
    if (query.dateFrom) replacements.dateFrom = query.dateFrom;
    if (query.dateTo) replacements.dateTo = query.dateTo;
    if (query.branchId) replacements.branchId = query.branchId;

    // Total orders, revenue, average
    const [summaryRows] = await sequelize.query(
      `SELECT
        COUNT(*)::int as "totalOrders",
        COALESCE(SUM("totalAmountBase"), SUM("totalAmount"))::numeric(15,2) as "totalRevenue",
        COALESCE(AVG("totalAmountBase"), AVG("totalAmount"))::numeric(15,2) as "averageOrderValue"
       FROM sales_orders so
       WHERE so."tenantId" = :tenantId AND so."deletedAt" IS NULL ${dateFilter} ${branchFilter}`,
      { replacements } as any,
    );
    const summary = (summaryRows as unknown as Record<string, unknown>[])[0] ?? {};

    // Breakdown by status
    const [statusRows] = await sequelize.query(
      `SELECT
        so.status,
        COUNT(*)::int as count,
        COALESCE(SUM("totalAmountBase"), SUM("totalAmount"))::numeric(15,2) as total
       FROM sales_orders so
       WHERE so."tenantId" = :tenantId AND so."deletedAt" IS NULL ${dateFilter} ${branchFilter}
       GROUP BY so.status`,
      { replacements } as any,
    );

    // Breakdown by branch
    const [branchRows] = await sequelize.query(
      `SELECT
        so."branchId",
        b."nameEn" as "branchName",
        COUNT(*)::int as count,
        COALESCE(SUM(so."totalAmountBase"), SUM(so."totalAmount"))::numeric(15,2) as total
       FROM sales_orders so
       LEFT JOIN branches b ON b.id = so."branchId"
       WHERE so."tenantId" = :tenantId AND so."deletedAt" IS NULL ${dateFilter} ${branchFilter}
       GROUP BY so."branchId", b."nameEn"`,
      { replacements } as any,
    );

    // Breakdown by currency (all totals in SAR base)
    const [currencyRows] = await sequelize.query(
      `SELECT
        so."currencyId",
        c.code as "currencyCode",
        COUNT(*)::int as count,
        SUM(so."totalAmount")::numeric(15,2) as total,
        COALESCE(SUM(so."totalAmountBase"), SUM(so."totalAmount"))::numeric(15,2) as "totalBase"
       FROM sales_orders so
       LEFT JOIN currencies c ON c.id = so."currencyId"
       WHERE so."tenantId" = :tenantId AND so."deletedAt" IS NULL ${dateFilter} ${branchFilter}
       GROUP BY so."currencyId", c.code`,
      { replacements } as any,
    );

    return {
      totalOrders: parseInt(String(summary.totalOrders ?? 0), 10),
      totalRevenue: parseFloat(String(summary.totalRevenue ?? 0)),
      averageOrderValue: parseFloat(String(summary.averageOrderValue ?? 0)),
      byStatus: statusRows as unknown as SalesReportSummary['byStatus'],
      byBranch: branchRows as unknown as SalesReportSummary['byBranch'],
      byCurrency: currencyRows as unknown as SalesReportSummary['byCurrency'],
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private buildDateFilter(query: SalesReportQueryDto): string {
    const parts: string[] = [];
    if (query.dateFrom) parts.push('AND so."createdAt" >= :dateFrom');
    if (query.dateTo) parts.push('AND so."createdAt" <= :dateTo');
    return parts.join(' ');
  }

  private calculateSingleLine(dto: CreateSalesOrderLineDto): {
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
  } {
    const lineGross = dto.quantity * dto.unitPrice;
    let lineDiscount = 0;

    if (dto.discountType && dto.discountValue) {
      if (dto.discountType === SalesDiscountType.PERCENTAGE) {
        lineDiscount = lineGross * (dto.discountValue / 100);
      } else {
        lineDiscount = dto.discountValue;
      }
    }

    const lineAfterDiscount = lineGross - lineDiscount;
    const taxRate = dto.taxRate ?? 15;
    const lineTax = lineAfterDiscount * (taxRate / 100);
    const lineTotal = lineAfterDiscount + lineTax;

    return {
      discountAmount: Math.round(lineDiscount * 100) / 100,
      taxRate,
      taxAmount: Math.round(lineTax * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
    };
  }

  private calculateLines(
    lines: CreateSalesOrderLineDto[],
    orderDiscountType?: SalesDiscountType,
    orderDiscountValue?: number,
  ): SalesOrderCalculationResult {
    const calculatedLines: SalesOrderLineCalculation[] = [];

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const line of lines) {
      const lineGross = line.quantity * line.unitPrice;

      // Line-level discount
      let lineDiscount = 0;
      if (line.discountType && line.discountValue) {
        if (line.discountType === SalesDiscountType.PERCENTAGE) {
          lineDiscount = lineGross * (line.discountValue / 100);
        } else {
          lineDiscount = line.discountValue;
        }
      }

      const lineAfterDiscount = lineGross - lineDiscount;
      const taxRate = line.taxRate ?? 15;
      const lineTax = lineAfterDiscount * (taxRate / 100);
      const lineTotal = lineAfterDiscount + lineTax;

      subtotal += lineGross;
      totalDiscount += lineDiscount;
      totalTax += lineTax;

      calculatedLines.push({
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountType: line.discountType,
        discountValue: line.discountValue,
        discountAmount: Math.round(lineDiscount * 100) / 100,
        taxRate,
        taxAmount: Math.round(lineTax * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100,
      });
    }

    // Order-level discount
    let orderDiscount = 0;
    if (orderDiscountType && orderDiscountValue) {
      if (orderDiscountType === SalesDiscountType.PERCENTAGE) {
        orderDiscount = (subtotal - totalDiscount) * (orderDiscountValue / 100);
      } else {
        orderDiscount = orderDiscountValue;
      }
      totalDiscount += orderDiscount;
    }

    const grandTotal = subtotal - totalDiscount + totalTax;

    return {
      lines: calculatedLines,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }

  private async recalculateOrderTotals(
    tenantId: string,
    orderId: string,
    order: Record<string, unknown>,
    auditContext: AuditContext,
    transaction: Transaction,
  ): Promise<void> {
    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);

    // Sum up line values from DB
    const [totalsResult] = await sequelize.query(
      `SELECT
        COALESCE(SUM(quantity * "unitPrice"), 0)::numeric(15,2) as subtotal,
        COALESCE(SUM("discountAmount"), 0)::numeric(15,2) as "totalLineDiscount",
        COALESCE(SUM("taxAmount"), 0)::numeric(15,2) as "totalTax",
        COALESCE(SUM("lineTotal"), 0)::numeric(15,2) as "totalLineAmount"
       FROM sales_order_lines
       WHERE "orderId" = :orderId AND "tenantId" = :tenantId`,
      { replacements: { orderId, tenantId }, transaction } as any,
    );

    const totals = (totalsResult as unknown as Record<string, unknown>[])[0] ?? {};
    const subtotal = parseFloat(String(totals.subtotal ?? 0));
    const totalLineDiscount = parseFloat(String(totals.totalLineDiscount ?? 0));
    const totalTax = parseFloat(String(totals.totalTax ?? 0));

    // Apply order-level discount
    let orderDiscount = 0;
    const discountType = order.discountType as string | undefined;
    const discountValue = parseFloat(String(order.discountValue ?? 0));
    if (discountType && discountValue) {
      if (discountType === SalesDiscountType.PERCENTAGE) {
        orderDiscount = (subtotal - totalLineDiscount) * (discountValue / 100);
      } else {
        orderDiscount = discountValue;
      }
    }

    const totalDiscount = totalLineDiscount + orderDiscount;
    const totalAmount = subtotal - totalDiscount + totalTax;

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
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalAmountBase: Math.round(totalAmount * 100) / 100,
        updatedBy: auditContext.userId ?? null,
      },
      transaction,
    );
  }

  /**
   * Resolves the default warehouse ID from tenant settings.
   */
  private async resolveWarehouseId(tenantId: string): Promise<string> {
    const setting = await this.tenantSettingsRepository.findByKeyTenant(
      tenantId,
      'defaultWarehouseId',
    );
    if (!setting?.value) {
      throw new BadRequestException(
        msg(ErrorMessages.SETTING_NOT_CONFIGURED, 'defaultWarehouseId'),
      );
    }
    return setting.value as string;
  }

  /**
   * Reads a required accounting setting from tenant_settings.
   */
  private async requireSetting(tenantId: string, key: string): Promise<string> {
    const setting = await this.tenantSettingsRepository.findByKeyTenant(tenantId, key);
    if (!setting?.value) {
      throw new BadRequestException(msg(ErrorMessages.SETTING_NOT_CONFIGURED, key));
    }
    return setting.value as string;
  }
}
