import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { QUEUE_INVENTORY } from '@/infrastructure/queues/queue.constants';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);

  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly outboxService: OutboxSharedService,
    @InjectQueue(QUEUE_INVENTORY) private readonly inventoryQueue: Queue,
  ) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.stockMovementsRepository.findAll(tenantId, {
      limit,
      offset,
      sortOrder,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const movement = await this.stockMovementsRepository.findById(tenantId, id);
    if (!movement) throw new NotFoundException('Stock movement not found');
    return movement;
  }

  async create(tenantId: string, dto: CreateStockMovementDto, auditContext: AuditContext) {
    const transaction = await this.stockMovementsRepository.getTransaction(tenantId);

    try {
      // Validate transfer has toWarehouseId
      if (dto.type === StockMovementType.TRANSFER && !dto.toWarehouseId) {
        throw new BadRequestException('toWarehouseId is required for transfer movements');
      }

      // Get current stock level
      const currentLevel = await this.stockLevelsRepository.findByProductAndWarehouse(
        tenantId,
        dto.productId,
        dto.warehouseId,
        transaction,
      );
      const quantityBefore = parseFloat(currentLevel?.quantity ?? '0');

      // Check insufficient stock for OUT and TRANSFER
      if (
        (dto.type === StockMovementType.OUT || dto.type === StockMovementType.TRANSFER) &&
        quantityBefore < dto.quantity
      ) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${quantityBefore}, Requested: ${dto.quantity}`,
        );
      }

      // Calculate new quantity
      const delta =
        dto.type === StockMovementType.OUT || dto.type === StockMovementType.TRANSFER
          ? -dto.quantity
          : dto.quantity;
      const quantityAfter = quantityBefore + delta;

      // Upsert stock level for source warehouse
      await this.stockLevelsRepository.upsert(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantity: quantityAfter,
        },
        transaction,
      );

      // Record movement
      const movementId = await this.stockMovementsRepository.create(
        tenantId,
        {
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
      );

      // Handle transfer: add stock to target warehouse
      if (dto.type === StockMovementType.TRANSFER && dto.toWarehouseId) {
        const targetLevel = await this.stockLevelsRepository.findByProductAndWarehouse(
          tenantId,
          dto.productId,
          dto.toWarehouseId,
          transaction,
        );
        const targetBefore = parseFloat(targetLevel?.quantity ?? '0');
        const targetAfter = targetBefore + dto.quantity;

        await this.stockLevelsRepository.upsert(
          tenantId,
          {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId,
            quantity: targetAfter,
          },
          transaction,
        );

        // Record incoming movement at target
        await this.stockMovementsRepository.create(
          tenantId,
          {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId,
            movementType: StockMovementType.IN,
            quantity: dto.quantity,
            quantityBefore: targetBefore,
            quantityAfter: targetAfter,
            notes: `Transfer from warehouse`,
            referenceId: movementId,
            referenceType: StockReferenceType.TRANSFER,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        );
      }

      // Check low stock and create outbox event for movements that reduce quantity
      const reducesQuantity =
        dto.type === StockMovementType.OUT || dto.type === StockMovementType.TRANSFER;
      if (reducesQuantity) {
        const product = await this.productsRepository.findProductReorderInfo(
          tenantId,
          dto.productId,
        );
        if (product && quantityAfter <= product.reorderPoint) {
          await this.outboxService.createEvent({
            tenantId,
            eventType: 'stock.low_reorder_point',
            payload: {
              productId: dto.productId,
              productName: product.nameEn ?? '',
              currentQty: quantityAfter,
              reorderPoint: product.reorderPoint,
              warehouseId: dto.warehouseId,
            },
            transaction,
          });
        }
      }

      await transaction.commit();

      // Also enqueue the legacy low stock alert (non-transactional)
      const product = await this.productsRepository.findProductReorderInfo(tenantId, dto.productId);
      if (product && quantityAfter <= product.reorderPoint) {
        await this.inventoryQueue.add('low-stock-alert', {
          tenantId,
          productId: dto.productId,
          productName: product.nameEn ?? '',
          currentQuantity: quantityAfter,
          reorderPoint: product.reorderPoint,
          warehouseId: dto.warehouseId,
        });
      }

      return { id: movementId, quantityBefore, quantityAfter };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getByProduct(tenantId: string, productId: string, pagination: PaginationDto) {
    const { limit = 20, page = 1 } = pagination;
    const offset = (page - 1) * limit;
    return this.stockMovementsRepository.findByProduct(tenantId, productId, { limit, offset });
  }

  async getByWarehouse(tenantId: string, warehouseId: string, pagination: PaginationDto) {
    const { limit = 20, page = 1 } = pagination;
    const offset = (page - 1) * limit;
    return this.stockMovementsRepository.findByWarehouse(tenantId, warehouseId, {
      limit,
      offset,
    });
  }

  async getStockLevels(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, page = 1, search } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.stockLevelsRepository.findAllWithDetails(tenantId, {
      limit,
      offset,
      search,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLowStockAlerts(tenantId: string) {
    return this.stockLevelsRepository.findLowStockAlerts(tenantId);
  }

  async getValuationReport(tenantId: string) {
    return this.stockLevelsRepository.getValuationReport(tenantId);
  }

  async getProductAvailability(
    tenantId: string,
    productId: string,
    warehouseId?: string,
    quantity?: number,
  ) {
    const stockLevel = await this.stockLevelsRepository.findAvailability(
      tenantId,
      productId,
      warehouseId,
    );

    const totalQty = parseFloat(stockLevel?.quantity ?? '0');
    const reservedQty = parseFloat(stockLevel?.reservedQuantity ?? '0');
    const availableQty = totalQty - reservedQty;
    const requestedQty = quantity ?? 0;

    return {
      available: requestedQty > 0 ? availableQty >= requestedQty : availableQty > 0,
      availableQty,
      reservedQty,
      totalQty,
      warehouseId: stockLevel?.warehouseId ?? warehouseId ?? null,
      productId,
    };
  }
}
