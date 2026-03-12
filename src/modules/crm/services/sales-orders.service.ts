import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SalesOrderLinesRepository } from '@/database/sql/repositories/sales-order-lines.repository';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { CreateSalesOrderLineDto } from '../dto/create-sales-order-line.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly salesOrderLinesRepository: SalesOrderLinesRepository,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly sequencesService: SequencesService,
  ) {}

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
    if (!order) throw new NotFoundException('Sales order not found');

    const lines = await this.salesOrderLinesRepository.findLinesByOrderId(tenantId, id);
    return { ...order, lines };
  }

  async create(tenantId: string, dto: CreateSalesOrderDto, auditContext: AuditContext) {
    // Strip orderNumber from input — always generate via sequence
    const { orderNumber: _stripped, ...safeDto } = dto as CreateSalesOrderDto & {
      orderNumber?: string;
    };

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      // Validate credit/debit note references
      if (
        (safeDto.transactionType === 'credit_note' || safeDto.transactionType === 'debit_note') &&
        !safeDto.originalInvoiceId
      ) {
        throw new BadRequestException(
          `originalInvoiceId is required for ${safeDto.transactionType}`,
        );
      }

      if (safeDto.originalInvoiceId) {
        const exists = await this.salesOrdersRepository.findOriginalInvoice(
          tenantId,
          safeDto.originalInvoiceId,
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
        'sales_order',
        safeDto.branchId,
      );

      // Generate ZATCA UUID and counter via sequences service (never resets manually)
      const zatcaUUID = uuidv4();
      const zatcaInvoiceCounter = parseInt(
        (await this.sequencesService.nextNumber(tenantId, 'zatca_invoice')).replace(/\D/g, ''),
        10,
      );

      // Calculate line totals
      const lineCalculations = this.calculateLines(
        safeDto.lines,
        safeDto.discountType,
        safeDto.discountValue,
      );

      // Insert order
      await this.salesOrdersRepository.insertOrder(
        tenantId,
        {
          id,
          orderNumber,
          contactId: safeDto.contactId,
          subtotal: lineCalculations.subtotal,
          discountAmount: lineCalculations.totalDiscount,
          taxAmount: lineCalculations.totalTax,
          totalAmount: lineCalculations.grandTotal,
          notes: safeDto.notes ?? null,
          invoiceType: safeDto.invoiceType,
          transactionType: safeDto.transactionType,
          supplyType: safeDto.supplyType,
          taxCategory: safeDto.taxCategory,
          taxExemptionCode: safeDto.taxExemptionCode ?? null,
          taxExemptionReason: safeDto.taxExemptionReason ?? null,
          originalInvoiceId: safeDto.originalInvoiceId ?? null,
          zatcaUUID,
          zatcaInvoiceCounter,
          createdBy: auditContext.userId ?? null,
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

      // Write outbox event in the same transaction
      await this.outboxService.createEvent({
        tenantId,
        eventType: 'sales_order.created',
        payload: {
          orderId: id,
          orderNumber,
          contactId: safeDto.contactId,
          totalAmount: lineCalculations.grandTotal,
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

  async update(tenantId: string, id: string, dto: UpdateSalesOrderDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft orders can be updated');
    }

    // Optimistic locking check
    if (existing.version !== undefined && existing.version !== dto.version) {
      throw new ConflictException('Record was modified by another user');
    }

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      const updates: string[] = [
        'updated_at = NOW()',
        'updated_by = :updatedBy',
        'version = version + 1',
      ];
      const replacements: Record<string, unknown> = {
        id,
        updatedBy: auditContext.userId ?? null,
      };

      if (dto.contactId !== undefined) {
        updates.push('contact_id = :contactId');
        replacements.contactId = dto.contactId;
      }
      if (dto.supplyType !== undefined) {
        updates.push('supply_type = :supplyType');
        replacements.supplyType = dto.supplyType;
      }
      if (dto.taxCategory !== undefined) {
        updates.push('tax_category = :taxCategory');
        replacements.taxCategory = dto.taxCategory;
      }
      if (dto.taxExemptionCode !== undefined) {
        updates.push('tax_exemption_code = :taxExemptionCode');
        replacements.taxExemptionCode = dto.taxExemptionCode;
      }
      if (dto.taxExemptionReason !== undefined) {
        updates.push('tax_exemption_reason = :taxExemptionReason');
        replacements.taxExemptionReason = dto.taxExemptionReason;
      }
      if (dto.notes !== undefined) {
        updates.push('notes = :notes');
        replacements.notes = dto.notes;
      }

      // If lines are provided, recalculate totals
      if (dto.lines && dto.lines.length > 0) {
        // Delete existing lines
        await this.salesOrderLinesRepository.deleteByOrderId(tenantId, id, transaction);

        const lineCalculations = this.calculateLines(
          dto.lines,
          dto.discountType,
          dto.discountValue,
        );

        updates.push('subtotal = :subtotal');
        updates.push('discount_amount = :discountAmount');
        updates.push('tax_amount = :taxAmount');
        updates.push('total_amount = :totalAmount');
        replacements.subtotal = lineCalculations.subtotal;
        replacements.discountAmount = lineCalculations.totalDiscount;
        replacements.taxAmount = lineCalculations.totalTax;
        replacements.totalAmount = lineCalculations.grandTotal;

        // Insert new lines
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

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'draft') {
      throw new BadRequestException('Only draft orders can be deleted');
    }

    await this.salesOrdersRepository.softDeleteOrder(tenantId, id, auditContext.userId ?? null);
  }

  // ── Status transitions ──

  async confirm(tenantId: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantId, id, 'confirmed', auditContext);
  }

  async ship(tenantId: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantId, id, 'shipped', auditContext);
  }

  async deliver(tenantId: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantId, id, 'delivered', auditContext);
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantId, id, 'cancelled', auditContext);
  }

  private async transitionStatus(
    tenantId: string,
    id: string,
    targetStatus: string,
    auditContext: AuditContext,
  ) {
    const order = await this.findById(tenantId, id);
    const currentStatus = order.status;

    // Validate transition using StatusTransitionSharedService
    this.statusTransitionService.validateOrThrow('order', currentStatus, targetStatus);

    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = await sequelize.transaction();

    try {
      await this.salesOrdersRepository.updateStatus(tenantId, id, {
        status: targetStatus,
        updatedBy: auditContext.userId ?? null,
      });

      // Create outbox events based on status change
      if (targetStatus === 'confirmed') {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'sales_order.confirmed',
          payload: {
            orderId: id,
            orderNumber: order.order_number ?? order.orderNumber,
            contactId: order.contact_id ?? order.contactId,
            lines: order.lines ?? [],
          },
          transaction,
        });
      } else if (targetStatus === 'delivered') {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'sales_order.delivered',
          payload: {
            orderId: id,
            orderNumber: order.order_number ?? order.orderNumber,
          },
          transaction,
        });
      } else if (targetStatus === 'cancelled') {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'sales_order.cancelled',
          payload: {
            orderId: id,
            orderNumber: order.order_number ?? order.orderNumber,
          },
          transaction,
        });
      }

      await transaction.commit();
      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ── Line calculation helpers ──

  private calculateLines(
    lines: CreateSalesOrderLineDto[],
    orderDiscountType?: 'percentage' | 'fixed',
    orderDiscountValue?: number,
  ) {
    const calculatedLines: Array<{
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
    }> = [];

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const line of lines) {
      const lineGross = line.quantity * line.unitPrice;

      // Line-level discount
      let lineDiscount = 0;
      if (line.discountType && line.discountValue) {
        if (line.discountType === 'percentage') {
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
        discountAmount: Math.round(lineDiscount * 100) / 100,
        taxRate,
        taxAmount: Math.round(lineTax * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100,
      });
    }

    // Order-level discount
    let orderDiscount = 0;
    if (orderDiscountType && orderDiscountValue) {
      if (orderDiscountType === 'percentage') {
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
}
