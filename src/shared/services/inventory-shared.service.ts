import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { StockMovementType } from '@/common/enums/inventory.enums';
import { CreateMovementDto } from '@/modules/inventory/dto/create-movement.dto';
import { StockOperationOptions } from '@/modules/inventory/interfaces/inventory.interface';
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
   * Now supports optional locationId, productVariantId, lotNumber, serialNumber.
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
      // Determine stock level lookup options based on DTO
      const stockLookupOptions = {
        locationId: dto.locationId ?? null,
        productVariantId: dto.productVariantId ?? null,
        lotNumber: dto.lotNumber ?? null,
        serialNumber: dto.serialNumber ?? null,
      };

      const hasGranularDimensions = !!(
        dto.locationId ||
        dto.productVariantId ||
        dto.lotNumber ||
        dto.serialNumber
      );

      // Get current stock level (location-aware if dimensions provided)
      const currentLevel = hasGranularDimensions
        ? await this.stockLevelsRepository.findByProductAndWarehouse(
            tenantId,
            dto.productId,
            dto.warehouseId,
            transaction,
            stockLookupOptions,
          )
        : await this.stockLevelsRepository.findAggregateByProductAndWarehouse(
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

      // Upsert stock level (location-aware when dimensions provided)
      await this.stockLevelsRepository.upsert(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantity: quantityAfter,
          averageCost: newAvgCost,
          lastCostPrice:
            isInbound && unitCost > 0 ? unitCost : parseFloat(currentLevel?.lastCostPrice ?? '0'),
          locationId: dto.locationId ?? null,
          productVariantId: dto.productVariantId ?? null,
          lotNumber: dto.lotNumber ?? null,
          serialNumber: dto.serialNumber ?? null,
          expiryDate: dto.expiryDate ?? null,
        },
        transaction,
      );

      // Determine from/to location IDs
      const fromLocationId = isOutbound
        ? (dto.fromLocationId ?? dto.locationId ?? null)
        : (dto.fromLocationId ?? null);
      const toLocationId = isInbound
        ? (dto.toLocationId ?? dto.locationId ?? null)
        : (dto.toLocationId ?? null);

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
          fromLocationId,
          toLocationId,
          productVariantId: dto.productVariantId ?? null,
          originModel: dto.originModel ?? null,
          originId: dto.originId ?? null,
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
      const level = await this.stockLevelsRepository.findAggregateByProductAndWarehouse(
        tenantId,
        productId,
        warehouseId,
      );
      return level ? [level] : [];
    }
    return this.stockLevelsRepository.findStockLevelsByProduct(tenantId, productId);
  }

  /**
   * Atomically increments reservedQuantity on stock level rows.
   * When locationId is provided, reserves on that specific location row.
   * Otherwise, reserves on the legacy aggregate row.
   */
  async reserveStock(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    containerTransaction?: any,
    options?: StockOperationOptions,
  ): Promise<void> {
    const sequelize = this.stockLevelsRepository.getSequelize();

    let whereClause = `"productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`;
    const replacements: Record<string, unknown> = {
      qty: quantity,
      productId,
      warehouseId,
      tenantId,
    };

    if (options?.locationId) {
      whereClause += ` AND "locationId" = :locationId`;
      replacements.locationId = options.locationId;
    }
    if (options?.productVariantId) {
      whereClause += ` AND "productVariantId" = :productVariantId`;
      replacements.productVariantId = options.productVariantId;
    }

    await sequelize.query(
      `UPDATE stock_levels
       SET "reservedQuantity" = "reservedQuantity" + :qty,
           "updatedAt" = NOW()
       WHERE ${whereClause}`,
      {
        replacements,
        transaction: containerTransaction,
      } as any,
    );
  }

  /**
   * Atomically decrements reservedQuantity on stock level rows, never below zero.
   */
  async releaseReservation(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    containerTransaction?: any,
    options?: StockOperationOptions,
  ): Promise<void> {
    const sequelize = this.stockLevelsRepository.getSequelize();

    let whereClause = `"productId" = :productId AND "warehouseId" = :warehouseId AND "tenantId" = :tenantId`;
    const replacements: Record<string, unknown> = {
      qty: quantity,
      productId,
      warehouseId,
      tenantId,
    };

    if (options?.locationId) {
      whereClause += ` AND "locationId" = :locationId`;
      replacements.locationId = options.locationId;
    }
    if (options?.productVariantId) {
      whereClause += ` AND "productVariantId" = :productVariantId`;
      replacements.productVariantId = options.productVariantId;
    }

    await sequelize.query(
      `UPDATE stock_levels
       SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - :qty),
           "updatedAt" = NOW()
       WHERE ${whereClause}`,
      {
        replacements,
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
