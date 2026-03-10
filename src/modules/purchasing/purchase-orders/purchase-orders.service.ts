import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0 } = pagination;
    const [rows] = await sequelize.query(
      `SELECT po.*, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON v.id = po.vendor_id WHERE po.deleted_at IS NULL ORDER BY po.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset }, type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM purchase_orders WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const order = (rows as any[])[0];
    if (!order) throw new NotFoundException('Purchase order not found');
    const [lines] = await sequelize.query(
      `SELECT * FROM purchase_order_lines WHERE order_id = :id`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    return { ...order, lines };
  }

  async create(tenantSlug: string, dto: CreatePurchaseOrderDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    const orderNumber = `PO-${Date.now()}`;
    let subtotal = 0;
    for (const line of dto.lines) {
      subtotal += line.quantity * line.unitPrice;
    }
    await sequelize.query(
      `INSERT INTO purchase_orders (id, order_number, vendor_id, subtotal, tax_amount, total_amount, currency, status, expected_delivery_date, notes, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :orderNumber, :vendorId, :subtotal, 0, :subtotal, :currency, 'draft', :expectedDeliveryDate, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          orderNumber,
          vendorId: dto.vendorId ?? null,
          subtotal,
          currency: dto.currency ?? 'USD',
          expectedDeliveryDate: dto.expectedDeliveryDate ?? null,
          notes: dto.notes ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    for (const line of dto.lines) {
      await sequelize.query(
        `INSERT INTO purchase_order_lines (id, order_id, product_id, description, quantity, unit_price, line_total, created_at, updated_at) VALUES (:id, :orderId, :productId, :description, :quantity, :unitPrice, :lineTotal, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            orderId: id,
            productId: line.productId ?? null,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.quantity * line.unitPrice,
          },
        } as any,
      );
    }
    return this.findOne(tenantSlug, id);
  }
}
