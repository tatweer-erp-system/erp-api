import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0 } = pagination;
    const [rows] = await sequelize.query(
      `SELECT so.*, c.first_name, c.last_name FROM sales_orders so LEFT JOIN contacts c ON c.id = so.contact_id WHERE so.deleted_at IS NULL ORDER BY so.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset }, type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT so.* FROM sales_orders so WHERE so.id = :id AND so.deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const order = (rows as any[])[0];
    if (!order) throw new NotFoundException('Sales order not found');
    const [lines] = await sequelize.query(`SELECT * FROM sales_order_lines WHERE order_id = :id`, {
      replacements: { id },
      type: 'SELECT',
    } as any);
    return { ...order, lines };
  }

  async create(tenantSlug: string, dto: CreateSalesOrderDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    const orderNumber = `SO-${Date.now()}`;
    let subtotal = 0;
    for (const line of dto.lines) {
      const discount = line.discount ?? 0;
      subtotal += line.quantity * line.unitPrice * (1 - discount / 100);
    }
    const totalAmount = subtotal;
    await sequelize.query(
      `INSERT INTO sales_orders (id, order_number, contact_id, subtotal, tax_amount, total_amount, currency, status, notes, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :orderNumber, :contactId, :subtotal, 0, :totalAmount, :currency, 'draft', :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          orderNumber,
          contactId: dto.contactId ?? null,
          subtotal,
          totalAmount,
          currency: dto.currency ?? 'USD',
          notes: dto.notes ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    for (const line of dto.lines) {
      const discount = line.discount ?? 0;
      const lineTotal = line.quantity * line.unitPrice * (1 - discount / 100);
      await sequelize.query(
        `INSERT INTO sales_order_lines (id, order_id, product_id, description, quantity, unit_price, discount, line_total, created_at, updated_at)
         VALUES (:id, :orderId, :productId, :description, :quantity, :unitPrice, :discount, :lineTotal, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            orderId: id,
            productId: line.productId ?? null,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount,
            lineTotal,
          },
        } as any,
      );
    }
    return this.findOne(tenantSlug, id);
  }
}
