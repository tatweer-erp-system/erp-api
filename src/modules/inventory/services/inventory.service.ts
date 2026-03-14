import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { QUEUE_INVENTORY } from '@/infrastructure/queues/queue.constants';
import { StockMovementType } from '@/common/enums/inventory.enums';
import { CreateMovementDto } from '../dto/create-movement.dto';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

const INBOUND_TYPES = new Set<string>([
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.OPENING,
  StockMovementType.RETURN,
  StockMovementType.IN,
]);

const OUTBOUND_TYPES = new Set<string>([
  StockMovementType.SALE_DELIVERY,
  StockMovementType.POS_SALE,
  StockMovementType.SCRAP,
  StockMovementType.OUT,
]);

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly outboxService: OutboxSharedService,
    @InjectQueue(QUEUE_INVENTORY) private readonly inventoryQueue: Queue,
  ) {}

  /**
   * Creates a stock movement and updates stock levels atomically.
   * Handles weighted average cost calculation for inbound/outbound movements.
   * This is the primary API for other modules (POS, Purchasing, Sales) to use.
   */
  async createMovement(
    tenantId: string,
    dto: CreateMovementDto,
    containerTransaction?: any,
  ): Promise<any> {
    const isOwner = !containerTransaction;
    const transaction =
      containerTransaction ?? (await this.stockMovementsRepository.getTransaction(tenantId));

    try {
      // Get current stock level
      const currentLevel = await this.stockLevelsRepository.findByProductAndWarehouse(
        tenantId,
        dto.productId,
        dto.warehouseId,
        transaction,
      );

      const quantityBefore = parseFloat(currentLevel?.quantity ?? '0');
      const currentAvgCost = parseFloat(currentLevel?.averageCost ?? '0');
      const currentReserved = parseFloat(currentLevel?.reservedQuantity ?? '0');

      // Determine delta based on movement type
      const isInbound =
        INBOUND_TYPES.has(dto.movementType) ||
        (dto.movementType === StockMovementType.ADJUSTMENT && dto.quantity > 0);
      const isOutbound =
        OUTBOUND_TYPES.has(dto.movementType) ||
        (dto.movementType === StockMovementType.ADJUSTMENT && dto.quantity < 0);

      let delta: number;
      let unitCost = dto.unitCost ?? 0;
      let totalCost = 0;
      let newAvgCost = currentAvgCost;

      if (isInbound) {
        delta = Math.abs(dto.quantity);

        // Weighted average cost calculation for inbound
        if (unitCost > 0) {
          const totalCurrentValue = quantityBefore * currentAvgCost;
          const inboundValue = delta * unitCost;
          const newTotalQty = quantityBefore + delta;
          newAvgCost =
            newTotalQty > 0 ? (totalCurrentValue + inboundValue) / newTotalQty : unitCost;
        }

        totalCost = delta * unitCost;
      } else if (isOutbound) {
        delta = -Math.abs(dto.quantity);

        // Check available stock for outbound
        const available = quantityBefore - currentReserved;
        if (Math.abs(delta) > available) {
          const product = await this.productsRepository.findNameById(
            tenantId,
            dto.productId,
            transaction,
          );
          const productName = product?.nameEn ?? dto.productId;
          throw new BadRequestException(
            msg(ErrorMessages.INSUFFICIENT_STOCK, productName, available, Math.abs(delta)),
          );
        }

        // Outbound uses current average cost
        unitCost = currentAvgCost;
        totalCost = Math.abs(delta) * unitCost;
      } else if (dto.movementType === StockMovementType.INTERNAL) {
        // Internal movements handled by transfers service
        delta = dto.quantity;
        unitCost = currentAvgCost;
        totalCost = Math.abs(delta) * unitCost;
      } else {
        delta = dto.quantity;
      }

      const quantityAfter = quantityBefore + delta;

      // Upsert stock level
      await this.stockLevelsRepository.upsert(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantity: quantityAfter,
          averageCost: newAvgCost,
          lastCostPrice:
            isInbound && unitCost > 0 ? unitCost : parseFloat(currentLevel?.lastCostPrice ?? '0'),
        },
        transaction,
      );

      // Record movement
      const movementId = await this.stockMovementsRepository.create(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          movementType: dto.movementType,
          quantity: dto.quantity,
          quantityBefore,
          quantityAfter,
          notes: dto.notes ?? null,
          referenceId: dto.referenceId ?? null,
          referenceType: dto.referenceType ?? null,
          createdBy: null,
          unitCost,
          totalCost,
          currencyId: null,
          lotNumber: dto.lotNumber ?? null,
          serialNumber: dto.serialNumber ?? null,
          expiryDate: dto.expiryDate ?? null,
          branchId: dto.branchId ?? null,
        },
        transaction,
      );

      // Reorder alert for stock-reducing movements
      if (delta < 0) {
        await this.checkLowStockAlert(
          tenantId,
          dto.productId,
          dto.warehouseId,
          quantityAfter,
          transaction,
        );
      }

      if (isOwner) await transaction.commit();

      // Non-transactional queue alert
      if (delta < 0) {
        const product = await this.productsRepository.findProductReorderInfo(
          tenantId,
          dto.productId,
        );
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
      }

      return {
        id: movementId,
        quantityBefore,
        quantityAfter,
        unitCost,
        totalCost,
        averageCost: newAvgCost,
      };
    } catch (error) {
      if (isOwner) await transaction.rollback();
      throw error;
    }
  }

  /**
   * Returns stock levels for a product across all warehouses, or for a specific warehouse.
   */
  async getStockLevel(tenantId: string, productId: string, warehouseId?: string): Promise<any[]> {
    if (warehouseId) {
      const level = await this.stockLevelsRepository.findByProductAndWarehouse(
        tenantId,
        productId,
        warehouseId,
      );
      return level ? [level] : [];
    }
    return this.stockLevelsRepository.findStockLevelsByProduct(tenantId, productId);
  }

  /**
   * Returns products with stock at or below reorder point.
   */
  async getLowStockProducts(tenantId: string, warehouseId?: string): Promise<any[]> {
    const allLow = await this.stockLevelsRepository.findLowStockAlerts(tenantId);
    if (warehouseId) {
      return (allLow as any[]).filter((row: any) => row.warehouseId === warehouseId);
    }
    return allLow as any[];
  }

  private async checkLowStockAlert(
    tenantId: string,
    productId: string,
    warehouseId: string,
    currentQty: number,
    transaction: any,
  ): Promise<void> {
    const product = await this.productsRepository.findProductReorderInfo(tenantId, productId);
    if (product && currentQty <= product.reorderPoint) {
      await this.outboxService.createEvent({
        tenantId,
        eventType: 'low_stock_alert',
        payload: {
          productId,
          productNameEn: product.nameEn ?? '',
          productNameAr: product.nameAr ?? '',
          warehouseId,
          currentQty,
          reorderPoint: product.reorderPoint,
          reorderQty: product.reorderPoint - currentQty,
        },
        transaction,
      });
    }
  }
}
