import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { StatusTransitionSharedService } from '../../../shared/services/status-transition.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { CreateSalesOrderLineDto } from '../dto/create-sales-order-line.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly statusTransitionService: StatusTransitionSharedService,
  ) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? `AND (so.order_number ILIKE :search OR c.first_name ILIKE :search OR c.last_name ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT so.*, c.first_name as contact_first_name, c.last_name as contact_last_name
       FROM sales_orders so
       LEFT JOIN contacts c ON c.id = so.contact_id
       WHERE so.deleted_at IS NULL ${whereClause}
       ORDER BY so.created_at ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM sales_orders so
       LEFT JOIN contacts c ON c.id = so.contact_id
       WHERE so.deleted_at IS NULL ${whereClause}`,
      { replacements: { search: search ? `%${search}%` : '' }, type: 'SELECT' } as any,
    );
    const total = parseInt((countResult as any[])[0]?.total ?? '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT so.*, c.first_name as contact_first_name, c.last_name as contact_last_name
       FROM sales_orders so
       LEFT JOIN contacts c ON c.id = so.contact_id
       WHERE so.id = :id AND so.deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const order = (rows as any[])[0];
    if (!order) throw new NotFoundException('Sales order not found');

    const [lines] = await sequelize.query(
      `SELECT sol.*, p.name as product_name, p.sku as product_sku
       FROM sales_order_lines sol
       LEFT JOIN products p ON p.id = sol.product_id
       WHERE sol.order_id = :id
       ORDER BY sol.created_at`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    return { ...order, lines };
  }

  async create(tenantSlug: string, dto: CreateSalesOrderDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const transaction = await sequelize.transaction();

    try {
      // Validate credit/debit note references
      if (
        (dto.transactionType === 'credit_note' || dto.transactionType === 'debit_note') &&
        !dto.originalInvoiceId
      ) {
        throw new BadRequestException(`originalInvoiceId is required for ${dto.transactionType}`);
      }

      if (dto.originalInvoiceId) {
        const [origRows] = await sequelize.query(
          `SELECT id FROM sales_orders WHERE id = :id AND deleted_at IS NULL`,
          { replacements: { id: dto.originalInvoiceId }, type: 'SELECT', transaction } as any,
        );
        if ((origRows as any[]).length === 0) {
          throw new NotFoundException('Original invoice not found');
        }
      }

      const id = uuidv4();
      const orderNumber = `SO-${Date.now()}`;

      // Generate ZATCA UUID and counter
      const zatcaUUID = uuidv4();
      const [counterResult] = await sequelize.query(
        `SELECT COALESCE(MAX(zatca_invoice_counter), 0) + 1 as next_counter FROM sales_orders`,
        { type: 'SELECT', transaction } as any,
      );
      const zatcaInvoiceCounter = parseInt((counterResult as any[])[0]?.next_counter ?? '1', 10);

      // Calculate line totals
      const lineCalculations = this.calculateLines(dto.lines, dto.discountType, dto.discountValue);

      // Insert order
      await sequelize.query(
        `INSERT INTO sales_orders (
          id, order_number, contact_id, subtotal, discount_amount, tax_amount, total_amount,
          currency, status, notes, invoice_type, transaction_type, supply_type,
          tax_category, tax_exemption_code, tax_exemption_reason, original_invoice_id,
          zatca_uuid, zatca_invoice_counter, zatca_status,
          created_by, updated_by, created_at, updated_at
        ) VALUES (
          :id, :orderNumber, :contactId, :subtotal, :discountAmount, :taxAmount, :totalAmount,
          'SAR', 'draft', :notes, :invoiceType, :transactionType, :supplyType,
          :taxCategory, :taxExemptionCode, :taxExemptionReason, :originalInvoiceId,
          :zatcaUUID, :zatcaInvoiceCounter, 'pending',
          :createdBy, :createdBy, NOW(), NOW()
        )`,
        {
          replacements: {
            id,
            orderNumber,
            contactId: dto.contactId,
            subtotal: lineCalculations.subtotal,
            discountAmount: lineCalculations.totalDiscount,
            taxAmount: lineCalculations.totalTax,
            totalAmount: lineCalculations.grandTotal,
            notes: dto.notes ?? null,
            invoiceType: dto.invoiceType,
            transactionType: dto.transactionType,
            supplyType: dto.supplyType,
            taxCategory: dto.taxCategory,
            taxExemptionCode: dto.taxExemptionCode ?? null,
            taxExemptionReason: dto.taxExemptionReason ?? null,
            originalInvoiceId: dto.originalInvoiceId ?? null,
            zatcaUUID,
            zatcaInvoiceCounter,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        } as any,
      );

      // Insert lines
      for (const lineCalc of lineCalculations.lines) {
        await sequelize.query(
          `INSERT INTO sales_order_lines (
            id, order_id, product_id, description, quantity, unit_price,
            discount_amount, tax_rate, tax_amount, line_total, created_at, updated_at
          ) VALUES (
            :id, :orderId, :productId, :description, :quantity, :unitPrice,
            :discountAmount, :taxRate, :taxAmount, :lineTotal, NOW(), NOW()
          )`,
          {
            replacements: {
              id: uuidv4(),
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
          } as any,
        );
      }

      await transaction.commit();
      return this.findById(tenantSlug, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(
    tenantSlug: string,
    id: string,
    dto: UpdateSalesOrderDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.findById(tenantSlug, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft orders can be updated');
    }

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const transaction = await sequelize.transaction();

    try {
      const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
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
        await sequelize.query(`DELETE FROM sales_order_lines WHERE order_id = :orderId`, {
          replacements: { orderId: id },
          transaction,
        } as any);

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
          await sequelize.query(
            `INSERT INTO sales_order_lines (
              id, order_id, product_id, description, quantity, unit_price,
              discount_amount, tax_rate, tax_amount, line_total, created_at, updated_at
            ) VALUES (
              :id, :orderId, :productId, :description, :quantity, :unitPrice,
              :discountAmount, :taxRate, :taxAmount, :lineTotal, NOW(), NOW()
            )`,
            {
              replacements: {
                id: uuidv4(),
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
            } as any,
          );
        }
      }

      await sequelize.query(`UPDATE sales_orders SET ${updates.join(', ')} WHERE id = :id`, {
        replacements,
        transaction,
      } as any);

      await transaction.commit();
      return this.findById(tenantSlug, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext): Promise<void> {
    const order = await this.findById(tenantSlug, id);
    if (order.status !== 'draft') {
      throw new BadRequestException('Only draft orders can be deleted');
    }

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE sales_orders SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
    );
  }

  // ── Status transitions ──

  async confirm(tenantSlug: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantSlug, id, 'confirmed', auditContext);
  }

  async ship(tenantSlug: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantSlug, id, 'shipped', auditContext);
  }

  async deliver(tenantSlug: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantSlug, id, 'delivered', auditContext);
  }

  async cancel(tenantSlug: string, id: string, auditContext: AuditContext) {
    return this.transitionStatus(tenantSlug, id, 'cancelled', auditContext);
  }

  private async transitionStatus(
    tenantSlug: string,
    id: string,
    targetStatus: string,
    auditContext: AuditContext,
  ) {
    const order = await this.findById(tenantSlug, id);
    const currentStatus = order.status;

    // Validate transition using StatusTransitionSharedService
    this.statusTransitionService.validateOrThrow('order', currentStatus, targetStatus);

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE sales_orders SET status = :status, updated_by = :updatedBy, updated_at = NOW() WHERE id = :id`,
      {
        replacements: {
          id,
          status: targetStatus,
          updatedBy: auditContext.userId ?? null,
        },
      } as any,
    );

    return this.findById(tenantSlug, id);
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
