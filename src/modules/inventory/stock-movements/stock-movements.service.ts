import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QUEUE_INVENTORY } from '../../../infrastructure/queues/queue.constants';

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    @InjectQueue(QUEUE_INVENTORY) private readonly inventoryQueue: Queue,
  ) {}

  async create(tenantSlug: string, dto: CreateStockMovementDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Get current stock level
    const [levels] = await sequelize.query(
      `SELECT quantity FROM stock_levels WHERE product_id = :productId AND warehouse_id = :warehouseId`,
      { replacements: { productId: dto.productId, warehouseId: dto.warehouseId }, type: 'SELECT' } as any,
    );
    const currentLevel = (levels as any[])[0];
    const quantityBefore = parseFloat(currentLevel?.quantity ?? '0');
    const delta = dto.movementType === 'out' ? -dto.quantity : dto.quantity;
    const quantityAfter = quantityBefore + delta;

    // Upsert stock level
    await sequelize.query(
      `INSERT INTO stock_levels (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
       VALUES (:id, :productId, :warehouseId, :quantity, 0, NOW(), NOW())
       ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = :quantity, updated_at = NOW()`,
      { replacements: { id: uuidv4(), productId: dto.productId, warehouseId: dto.warehouseId, quantity: quantityAfter } } as any,
    );

    // Record movement
    const movementId = uuidv4();
    await sequelize.query(
      `INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, quantity_before, quantity_after, notes, reference_id, reference_type, created_by, created_at, updated_at)
       VALUES (:id, :productId, :warehouseId, :movementType, :quantity, :quantityBefore, :quantityAfter, :notes, :referenceId, :referenceType, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id: movementId, productId: dto.productId, warehouseId: dto.warehouseId,
          movementType: dto.movementType, quantity: dto.quantity, quantityBefore, quantityAfter,
          notes: dto.notes ?? null, referenceId: dto.referenceId ?? null, referenceType: dto.referenceType ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );

    // Check low stock
    const [products] = await sequelize.query(
      `SELECT name, reorder_point FROM products WHERE id = :productId`,
      { replacements: { productId: dto.productId }, type: 'SELECT' } as any,
    );
    const product = (products as any[])[0];
    if (product && quantityAfter <= product.reorder_point) {
      await this.inventoryQueue.add('low-stock-alert', {
        tenantSlug, productId: dto.productId, productName: product.name?.en ?? '',
        currentQuantity: quantityAfter, reorderPoint: product.reorder_point, warehouseId: dto.warehouseId,
      });
    }

    return { id: movementId, quantityBefore, quantityAfter };
  }

  async getStockLevels(tenantSlug: string, productId?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const whereClause = productId ? 'WHERE sl.product_id = :productId' : '';
    const [rows] = await sequelize.query(
      `SELECT sl.*, p.name as product_name, w.name as warehouse_name
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id
       JOIN warehouses w ON w.id = sl.warehouse_id
       ${whereClause} ORDER BY p.name->>'en'`,
      { replacements: { productId: productId ?? null }, type: 'SELECT' } as any,
    );
    return rows;
  }
}
