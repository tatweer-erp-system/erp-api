import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { QUEUE_INVENTORY } from '@/infrastructure/queues/queue.constants';
import { CreateMovementDto } from '../dto/create-movement.dto';
import { StockOperationOptions } from '../interfaces/inventory.interface';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly inventorySharedService: InventorySharedService,
    private readonly productsRepository: ProductsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    @InjectQueue(QUEUE_INVENTORY) private readonly inventoryQueue: Queue,
  ) {}

  /**
   * Creates a stock movement and updates stock levels atomically.
   * Delegates core logic to InventorySharedService, then handles Bull queue alert.
   */
  async createMovement(
    tenantId: string,
    dto: CreateMovementDto,
    containerTransaction?: any,
  ): Promise<any> {
    const result = await this.inventorySharedService.createMovement(
      tenantId,
      dto,
      containerTransaction,
    );

    // Non-transactional queue alert (step 8 — module-specific)
    const delta = result.quantityAfter - result.quantityBefore;
    if (delta < 0) {
      const product = await this.productsRepository.findProductReorderInfo(tenantId, dto.productId);
      if (product && result.quantityAfter <= product.reorderPoint) {
        await this.inventoryQueue.add('low-stock-alert', {
          tenantId,
          productId: dto.productId,
          productName: product.nameEn ?? '',
          currentQuantity: result.quantityAfter,
          reorderPoint: product.reorderPoint,
          warehouseId: dto.warehouseId,
        });
      }
    }

    return result;
  }

  /**
   * Returns stock levels for a product across all warehouses, or for a specific warehouse.
   */
  async getStockLevel(tenantId: string, productId: string, warehouseId?: string): Promise<any[]> {
    return this.inventorySharedService.getStockLevel(tenantId, productId, warehouseId);
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

  /**
   * Atomically increments reservedQuantity on a stock level row.
   * Supports optional location and variant dimensions.
   */
  async reserveStock(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    containerTransaction?: any,
    options?: StockOperationOptions,
  ): Promise<void> {
    return this.inventorySharedService.reserveStock(
      tenantId,
      productId,
      warehouseId,
      quantity,
      containerTransaction,
      options,
    );
  }

  /**
   * Atomically decrements reservedQuantity on a stock level row, never below zero.
   * Supports optional location and variant dimensions.
   */
  async releaseReservation(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    containerTransaction?: any,
    options?: StockOperationOptions,
  ): Promise<void> {
    return this.inventorySharedService.releaseReservation(
      tenantId,
      productId,
      warehouseId,
      quantity,
      containerTransaction,
      options,
    );
  }
}
