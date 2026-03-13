import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PurchaseOrderStatus } from '@/common/enums/purchasing.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { PurchaseOrdersRepository } from '@/database/sql/repositories/purchase-orders.repository';
import { PurchaseOrderLinesRepository } from '@/database/sql/repositories/purchase-order-lines.repository';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { ReceiveItemsDto } from '../dto/receive-items.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly purchaseOrderLinesRepository: PurchaseOrderLinesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly sequencesService: SequencesService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const limit = query.limit || 10;
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
    const lines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(tenantId, id);
    return { ...order, lines };
  }

  async create(tenantId: string, dto: CreatePurchaseOrderDto, auditContext: AuditContext) {
    // Strip orderNumber from input — always generate via sequence
    const { orderNumber: _stripped, ...safeDto } = dto as CreatePurchaseOrderDto & {
      orderNumber?: string;
    };

    // Generate order number via sequences service
    const orderNumber = await this.sequencesService.nextNumber(
      tenantId,
      'purchase_order',
      safeDto.branchId,
    );

    let subtotal = 0;
    let totalTax = 0;

    const lineData = safeDto.lines.map((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      const taxAmount = line.taxRate ? lineTotal * (line.taxRate / 100) : 0;
      subtotal += lineTotal;
      totalTax += taxAmount;
      return {
        lineTotal,
        taxAmount,
        ...line,
      };
    });

    const grandTotal = subtotal + totalTax;

    const orderId = await this.purchaseOrdersRepository.insertOrder(tenantId, {
      orderNumber,
      vendorId: safeDto.vendorId,
      subtotal,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      currency: 'SAR',
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
    const before = { ...existing };

    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be updated');
    }

    // Optimistic locking check
    if (existing.version !== undefined && existing.version !== dto.version) {
      throw new ConflictException('Record was modified by another user');
    }

    const updates: string[] = ['version = version + 1'];
    const replacements: Record<string, unknown> = { id };

    if (dto.expectedDeliveryDate !== undefined) {
      updates.push('"expectedDeliveryDate" = :expectedDeliveryDate');
      replacements.expectedDeliveryDate = dto.expectedDeliveryDate;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }

    if (dto.lines && dto.lines.length > 0) {
      // Delete existing lines and recreate
      await this.purchaseOrderLinesRepository.deleteByOrderId(tenantId, id);

      let subtotal = 0;
      let totalTax = 0;

      for (const line of dto.lines) {
        const lineTotal = line.quantity * line.unitPrice;
        const taxAmount = line.taxRate ? lineTotal * (line.taxRate / 100) : 0;
        subtotal += lineTotal;
        totalTax += taxAmount;

        await this.purchaseOrderLinesRepository.insertLine(tenantId, {
          orderId: id,
          productId: line.productId,
          description: line.description || '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxAmount,
          lineTotal,
        });
      }

      updates.push('subtotal = :subtotal');
      replacements.subtotal = subtotal;
      updates.push('"taxAmount" = :taxAmount');
      replacements.taxAmount = totalTax;
      updates.push('"totalAmount" = :totalAmount');
      replacements.totalAmount = subtotal + totalTax;
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

  async approve(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    const targetStatus = PurchaseOrderStatus.APPROVED;

    // Validate transition: draft/pending -> approved
    this.statusTransitionService.validateOrThrow('order', order.status, targetStatus);

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

  async receive(tenantId: string, id: string, dto: ReceiveItemsDto, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);

    if (
      ![
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.IN_PROGRESS,
      ].includes(order.status)
    ) {
      throw new BadRequestException('Only approved/confirmed orders can receive items');
    }

    const receivedLines: Array<{ lineId: string; productId: string; receivedQuantity: number }> =
      [];

    for (const receiveLine of dto.lines) {
      const line = await this.purchaseOrderLinesRepository.findOneByIdTenant(
        tenantId,
        receiveLine.lineId,
      );

      if (line.orderId !== id) {
        throw new BadRequestException(`Line ${receiveLine.lineId} does not belong to this order`);
      }

      receivedLines.push({
        lineId: receiveLine.lineId,
        productId: line.productId,
        receivedQuantity: receiveLine.receivedQuantity,
      });

      // Create stock movement record
      if (dto.warehouseId && line.productId) {
        await this.stockMovementsRepository.create(tenantId, {
          productId: line.productId,
          warehouseId: dto.warehouseId,
          movementType: StockMovementType.IN,
          quantity: receiveLine.receivedQuantity,
          quantityBefore: 0,
          quantityAfter: receiveLine.receivedQuantity,
          notes: null,
          referenceType: StockReferenceType.PURCHASE_ORDER,
          referenceId: id,
          createdBy: auditContext.userId || null,
        });
      }
    }

    // Update order status to delivered
    await this.purchaseOrdersRepository.updateOrder(
      tenantId,
      id,
      ['status = :status', '"updatedBy" = :updatedBy', '"updatedAt" = NOW()'],
      { id, status: PurchaseOrderStatus.RECEIVED, updatedBy: auditContext.userId || null },
    );

    // Create outbox event for purchase_order.received
    const sequelize = this.purchaseOrdersRepository.getSequelize();
    const outboxTransaction = await sequelize.transaction();
    try {
      await this.outboxService.createEvent({
        tenantId,
        eventType: 'purchase_order.received',
        payload: {
          orderId: id,
          orderNumber: order.orderNumber ?? order.orderNumber,
          lines: receivedLines,
          warehouseId: dto.warehouseId ?? null,
        },
        transaction: outboxTransaction,
      });
      await outboxTransaction.commit();
    } catch (outboxError) {
      await outboxTransaction.rollback();
      this.logger.warn(`Failed to write outbox event for PO ${id} receive: ${outboxError}`);
    }

    await this.auditService.logStatusChange(
      tenantId,
      'purchasing.orders',
      id,
      order.status,
      PurchaseOrderStatus.RECEIVED,
      auditContext.userId,
    );

    return this.findById(tenantId, id);
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findOneById(tenantId, id);
    const targetStatus = PurchaseOrderStatus.CANCELLED;

    this.statusTransitionService.validateOrThrow('order', order.status, targetStatus);

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

    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be deleted');
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
}
