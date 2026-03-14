import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { StockMovementType } from '@/common/enums/inventory.enums';
import { CreateMovementDto } from '@/modules/inventory/dto/create-movement.dto';
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
export class InventorySharedService {
  private readonly logger = new Logger(InventorySharedService.name);

  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly outboxService: OutboxSharedService,
  ) {}

  /**
   * Creates a stock movement and updates stock levels atomically.
   * Handles weighted average cost calculation for inbound/outbound movements.
   * Steps 1-7: transaction, stock calc, upsert, record movement, low-stock outbox event, commit.
   * Does NOT include Bull queue alert (step 8) — that stays in the module-level service.
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
   * Atomically increments reservedQuantity on a stock level row.
   */
  async reserveStock(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    containerTransaction?: any,
  ): Promise<void> {
    const sequelize = this.stockLevelsRepository.getSequelize();
    await sequelize.query(
      `UPDATE stock_levels
       SET "reservedQuantity" = "reservedQuantity" + :qty,
           "updatedAt" = NOW()
       WHERE "productId" = :productId
         AND "warehouseId" = :warehouseId
         AND "tenantId" = :tenantId
         AND "deletedAt" IS NULL`,
      {
        replacements: { qty: quantity, productId, warehouseId, tenantId },
        transaction: containerTransaction,
      } as any,
    );
  }

  /**
   * Atomically decrements reservedQuantity on a stock level row, never below zero.
   */
  async releaseReservation(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    containerTransaction?: any,
  ): Promise<void> {
    const sequelize = this.stockLevelsRepository.getSequelize();
    await sequelize.query(
      `UPDATE stock_levels
       SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - :qty),
           "updatedAt" = NOW()
       WHERE "productId" = :productId
         AND "warehouseId" = :warehouseId
         AND "tenantId" = :tenantId
         AND "deletedAt" IS NULL`,
      {
        replacements: { qty: quantity, productId, warehouseId, tenantId },
        transaction: containerTransaction,
      } as any,
    );
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
