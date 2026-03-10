import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseOrdersRepository } from '../../../database/repositories/purchase-orders.repository';
import { PurchaseOrderLinesRepository } from '../../../database/repositories/purchase-order-lines.repository';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { ReceiveItemsDto } from '../dto/receive-items.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { SharedAuditService } from '../../../shared/services/audit.service';
import { StatusTransitionService } from '../../../shared/services/status-transition.service';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly purchaseOrderLinesRepository: PurchaseOrderLinesRepository,
    private readonly auditService: SharedAuditService,
    private readonly statusTransitionService: StatusTransitionService,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    return this.purchaseOrdersRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: [],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantSlug: string, id: string) {
    const order = await this.purchaseOrdersRepository.findById(id);
    const lines = await this.purchaseOrderLinesRepository.findByOrderId(id);
    return { ...order.toJSON(), lines: lines.map((l) => l.toJSON()) };
  }

  async create(tenantSlug: string, dto: CreatePurchaseOrderDto, auditContext: AuditContext) {
    const orderNumber = `PO-${Date.now()}`;

    let subtotal = 0;
    let totalTax = 0;

    const lineData = dto.lines.map((line) => {
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

    const order = await this.purchaseOrdersRepository.create(
      {
        orderNumber,
        vendorId: dto.vendorId,
        subtotal,
        taxAmount: totalTax,
        totalAmount: grandTotal,
        currency: 'SAR',
        status: 'draft',
        expectedDeliveryDate: dto.expectedDeliveryDate || null,
        notes: dto.notes || null,
      } as any,
      { auditContext },
    );

    for (const line of lineData) {
      await this.purchaseOrderLinesRepository.create({
        orderId: order.id,
        productId: line.productId,
        description: line.description || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
      } as any);
    }

    await this.auditService.logCreate(
      tenantSlug,
      'purchasing.orders',
      order.id,
      order.toJSON(),
      auditContext.userId,
    );

    return this.findById(tenantSlug, order.id);
  }

  async update(
    tenantSlug: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.purchaseOrdersRepository.findById(id);
    const before = existing.toJSON();

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft purchase orders can be updated');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.expectedDeliveryDate !== undefined)
      updateData.expectedDeliveryDate = dto.expectedDeliveryDate;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.lines && dto.lines.length > 0) {
      // Delete existing lines and recreate
      const existingLines = await this.purchaseOrderLinesRepository.findByOrderId(id);
      for (const line of existingLines) {
        await line.destroy();
      }

      let subtotal = 0;
      let totalTax = 0;

      for (const line of dto.lines) {
        const lineTotal = line.quantity * line.unitPrice;
        const taxAmount = line.taxRate ? lineTotal * (line.taxRate / 100) : 0;
        subtotal += lineTotal;
        totalTax += taxAmount;

        await this.purchaseOrderLinesRepository.create({
          orderId: id,
          productId: line.productId,
          description: line.description || '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxAmount,
          lineTotal,
        } as any);
      }

      updateData.subtotal = subtotal;
      updateData.taxAmount = totalTax;
      updateData.totalAmount = subtotal + totalTax;
    }

    await this.purchaseOrdersRepository.update(id, updateData as any, { auditContext });

    const updated = await this.findById(tenantSlug, id);

    await this.auditService.logUpdate(
      tenantSlug,
      'purchasing.orders',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async approve(tenantSlug: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findById(id);
    const targetStatus = 'approved';

    // Validate transition: draft/pending -> approved
    this.statusTransitionService.validateOrThrow('order', order.status, targetStatus);

    await this.purchaseOrdersRepository.update(id, { status: targetStatus } as any, {
      auditContext,
    });

    await this.auditService.logStatusChange(
      tenantSlug,
      'purchasing.orders',
      id,
      order.status,
      targetStatus,
      auditContext.userId,
    );

    return this.findById(tenantSlug, id);
  }

  async receive(tenantSlug: string, id: string, dto: ReceiveItemsDto, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findById(id);

    if (!['approved', 'confirmed', 'in_progress'].includes(order.status)) {
      throw new BadRequestException('Only approved/confirmed orders can receive items');
    }

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    for (const receiveLine of dto.lines) {
      const line = await this.purchaseOrderLinesRepository.findById(receiveLine.lineId);

      if (line.orderId !== id) {
        throw new BadRequestException(`Line ${receiveLine.lineId} does not belong to this order`);
      }

      // Create stock movement record
      if (dto.warehouseId && line.productId) {
        await sequelize.query(
          `INSERT INTO stock_movements (id, product_id, warehouse_id, quantity, type, reference_type, reference_id, created_by, created_at, updated_at)
           VALUES (:id, :productId, :warehouseId, :quantity, 'in', 'purchase_order', :orderId, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv4(),
              productId: line.productId,
              warehouseId: dto.warehouseId,
              quantity: receiveLine.receivedQuantity,
              orderId: id,
              createdBy: auditContext.userId || null,
            },
          } as any,
        );
      }
    }

    // Update order status to delivered
    await this.purchaseOrdersRepository.update(id, { status: 'delivered' } as any, {
      auditContext,
    });

    await this.auditService.logStatusChange(
      tenantSlug,
      'purchasing.orders',
      id,
      order.status,
      'delivered',
      auditContext.userId,
    );

    return this.findById(tenantSlug, id);
  }

  async cancel(tenantSlug: string, id: string, auditContext: AuditContext) {
    const order = await this.purchaseOrdersRepository.findById(id);
    const targetStatus = 'cancelled';

    this.statusTransitionService.validateOrThrow('order', order.status, targetStatus);

    await this.purchaseOrdersRepository.update(id, { status: targetStatus } as any, {
      auditContext,
    });

    await this.auditService.logStatusChange(
      tenantSlug,
      'purchasing.orders',
      id,
      order.status,
      targetStatus,
      auditContext.userId,
    );

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext) {
    const existing = await this.purchaseOrdersRepository.findById(id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft purchase orders can be deleted');
    }

    await this.purchaseOrdersRepository.softDelete(id, { auditContext });

    await this.auditService.logDelete(
      tenantSlug,
      'purchasing.orders',
      id,
      existing.toJSON(),
      auditContext.userId,
    );
  }
}
