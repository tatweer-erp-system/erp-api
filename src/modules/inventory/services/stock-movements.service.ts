import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { QUEUE_INVENTORY } from '../../../infrastructure/queues/queue.constants';

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    @InjectQueue(QUEUE_INVENTORY) private readonly inventoryQueue: Queue,
  ) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const [rows] = await sequelize.query(
      `SELECT sm.*, p.name as product_name, w.name as warehouse_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN warehouses w ON w.id = sm.warehouse_id
       ORDER BY sm.created_at ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset }, type: 'SELECT' } as any,
    );

    const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM stock_movements`, {
      type: 'SELECT',
    } as any);
    const total = parseInt((countResult as any[])[0]?.total ?? '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT sm.*, p.name as product_name, w.name as warehouse_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN warehouses w ON w.id = sm.warehouse_id
       WHERE sm.id = :id`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const movement = (rows as any[])[0];
    if (!movement) throw new NotFoundException('Stock movement not found');
    return movement;
  }

  async create(tenantSlug: string, dto: CreateStockMovementDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const transaction = await sequelize.transaction();

    try {
      // Validate transfer has toWarehouseId
      if (dto.type === 'transfer' && !dto.toWarehouseId) {
        throw new BadRequestException('toWarehouseId is required for transfer movements');
      }

      // Get current stock level
      const [levels] = await sequelize.query(
        `SELECT quantity FROM stock_levels WHERE product_id = :productId AND warehouse_id = :warehouseId`,
        {
          replacements: { productId: dto.productId, warehouseId: dto.warehouseId },
          type: 'SELECT',
          transaction,
        } as any,
      );
      const currentLevel = (levels as any[])[0];
      const quantityBefore = parseFloat(currentLevel?.quantity ?? '0');

      // Check insufficient stock for OUT and TRANSFER
      if ((dto.type === 'out' || dto.type === 'transfer') && quantityBefore < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${quantityBefore}, Requested: ${dto.quantity}`,
        );
      }

      // Calculate new quantity
      const delta = dto.type === 'out' || dto.type === 'transfer' ? -dto.quantity : dto.quantity;
      const quantityAfter = quantityBefore + delta;

      // Upsert stock level for source warehouse
      await sequelize.query(
        `INSERT INTO stock_levels (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
         VALUES (:id, :productId, :warehouseId, :quantity, 0, NOW(), NOW())
         ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = :quantity, updated_at = NOW()`,
        {
          replacements: {
            id: uuidv4(),
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            quantity: quantityAfter,
          },
          transaction,
        } as any,
      );

      // Record movement
      const movementId = uuidv4();
      await sequelize.query(
        `INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, quantity_before, quantity_after, notes, reference_id, reference_type, created_by, created_at, updated_at)
         VALUES (:id, :productId, :warehouseId, :movementType, :quantity, :quantityBefore, :quantityAfter, :notes, :referenceId, :referenceType, :createdBy, NOW(), NOW())`,
        {
          replacements: {
            id: movementId,
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            movementType: dto.type,
            quantity: dto.quantity,
            quantityBefore,
            quantityAfter,
            notes: dto.reason ?? null,
            referenceId: dto.referenceId ?? null,
            referenceType: dto.referenceType ?? null,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        } as any,
      );

      // Handle transfer: add stock to target warehouse
      if (dto.type === 'transfer' && dto.toWarehouseId) {
        const [targetLevels] = await sequelize.query(
          `SELECT quantity FROM stock_levels WHERE product_id = :productId AND warehouse_id = :warehouseId`,
          {
            replacements: { productId: dto.productId, warehouseId: dto.toWarehouseId },
            type: 'SELECT',
            transaction,
          } as any,
        );
        const targetBefore = parseFloat((targetLevels as any[])[0]?.quantity ?? '0');
        const targetAfter = targetBefore + dto.quantity;

        await sequelize.query(
          `INSERT INTO stock_levels (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
           VALUES (:id, :productId, :warehouseId, :quantity, 0, NOW(), NOW())
           ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = :quantity, updated_at = NOW()`,
          {
            replacements: {
              id: uuidv4(),
              productId: dto.productId,
              warehouseId: dto.toWarehouseId,
              quantity: targetAfter,
            },
            transaction,
          } as any,
        );

        // Record incoming movement at target
        await sequelize.query(
          `INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, quantity_before, quantity_after, notes, reference_id, reference_type, created_by, created_at, updated_at)
           VALUES (:id, :productId, :warehouseId, 'in', :quantity, :quantityBefore, :quantityAfter, :notes, :referenceId, :referenceType, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv4(),
              productId: dto.productId,
              warehouseId: dto.toWarehouseId,
              quantity: dto.quantity,
              quantityBefore: targetBefore,
              quantityAfter: targetAfter,
              notes: `Transfer from warehouse`,
              referenceId: movementId,
              referenceType: 'transfer',
              createdBy: auditContext.userId ?? null,
            },
            transaction,
          } as any,
        );
      }

      await transaction.commit();

      // Check low stock alert
      const [products] = await sequelize.query(
        `SELECT name, reorder_point FROM products WHERE id = :productId`,
        { replacements: { productId: dto.productId }, type: 'SELECT' } as any,
      );
      const product = (products as any[])[0];
      if (product && quantityAfter <= product.reorder_point) {
        await this.inventoryQueue.add('low-stock-alert', {
          tenantSlug,
          productId: dto.productId,
          productName: product.name?.en ?? '',
          currentQuantity: quantityAfter,
          reorderPoint: product.reorder_point,
          warehouseId: dto.warehouseId,
        });
      }

      return { id: movementId, quantityBefore, quantityAfter };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getByProduct(tenantSlug: string, productId: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, page = 1 } = pagination;
    const offset = (page - 1) * limit;

    const [rows] = await sequelize.query(
      `SELECT sm.*, w.name as warehouse_name
       FROM stock_movements sm
       JOIN warehouses w ON w.id = sm.warehouse_id
       WHERE sm.product_id = :productId
       ORDER BY sm.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { productId, limit, offset }, type: 'SELECT' } as any,
    );
    return rows;
  }

  async getByWarehouse(tenantSlug: string, warehouseId: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, page = 1 } = pagination;
    const offset = (page - 1) * limit;

    const [rows] = await sequelize.query(
      `SELECT sm.*, p.name as product_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       WHERE sm.warehouse_id = :warehouseId
       ORDER BY sm.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { warehouseId, limit, offset }, type: 'SELECT' } as any,
    );
    return rows;
  }

  async getStockLevels(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, page = 1, search } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? `AND (p.name->>'en' ILIKE :search OR p.name->>'ar' ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT sl.*, p.name as product_name, p.sku, p.reorder_point, w.name as warehouse_name
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = sl.warehouse_id AND w.deleted_at IS NULL
       WHERE 1=1 ${whereClause}
       ORDER BY p.name->>'en' LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = sl.warehouse_id AND w.deleted_at IS NULL
       WHERE 1=1 ${whereClause}`,
      { replacements: { search: search ? `%${search}%` : '' }, type: 'SELECT' } as any,
    );
    const total = parseInt((countResult as any[])[0]?.total ?? '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLowStockAlerts(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT sl.*, p.name as product_name, p.sku, p.reorder_point, w.name as warehouse_name
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = sl.warehouse_id AND w.deleted_at IS NULL
       WHERE sl.quantity <= p.reorder_point
       ORDER BY sl.quantity ASC`,
      { type: 'SELECT' } as any,
    );
    return rows;
  }
}
