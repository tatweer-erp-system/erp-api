import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { CreateAdjustmentDto } from '../dto/create-adjustment.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class AdjustmentsService {
  private readonly logger = new Logger(AdjustmentsService.name);

  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly outboxService: OutboxSharedService,
    private readonly journalPosterService: JournalPosterSharedService,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
  ) {}

  async create(tenantId: string, dto: CreateAdjustmentDto, auditContext: AuditContext) {
    const transaction = await this.stockMovementsRepository.getTransaction(tenantId);

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
      const quantityAfter = quantityBefore + dto.quantity;

      let newAvgCost = currentAvgCost;
      let unitCost = dto.unitCost ?? 0;

      // For positive adjustments (increase), update averageCost using weighted average
      if (dto.quantity > 0 && unitCost > 0) {
        const totalCurrentValue = quantityBefore * currentAvgCost;
        const inboundValue = dto.quantity * unitCost;
        const newTotalQty = quantityBefore + dto.quantity;
        newAvgCost = newTotalQty > 0 ? (totalCurrentValue + inboundValue) / newTotalQty : unitCost;
      }

      // For negative adjustments (decrease), use current average cost
      if (dto.quantity < 0) {
        unitCost = currentAvgCost;
      }

      const totalCost = Math.abs(dto.quantity) * unitCost;

      // Upsert stock level atomically
      await this.stockLevelsRepository.upsert(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantity: quantityAfter,
          averageCost: newAvgCost,
          lastCostPrice:
            dto.quantity > 0 && unitCost > 0
              ? unitCost
              : parseFloat(currentLevel?.lastCostPrice ?? '0'),
        },
        transaction,
      );

      // Record the adjustment movement
      const movementId = await this.stockMovementsRepository.create(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          movementType: StockMovementType.ADJUSTMENT,
          quantity: dto.quantity,
          quantityBefore,
          quantityAfter,
          notes: dto.reason,
          referenceId: null,
          referenceType: StockReferenceType.ADJUSTMENT,
          createdBy: auditContext.userId ?? null,
          unitCost,
          totalCost,
          lotNumber: dto.lotNumber ?? null,
          serialNumber: dto.serialNumber ?? null,
          expiryDate: dto.expiryDate ?? null,
        },
        transaction,
      );

      // Post accounting journal entry for stock adjustment
      const inventorySettingRow = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        'coaInventory',
      );
      const adjustmentSettingRow = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        'coaInventoryAdjustment',
      );
      const inventoryAccountId = inventorySettingRow?.value ?? null;
      const adjustmentAccountId = adjustmentSettingRow?.value ?? null;

      if (inventoryAccountId && adjustmentAccountId) {
        const amount =
          Math.abs(dto.quantity) * (dto.quantity > 0 && unitCost > 0 ? unitCost : currentAvgCost);

        const journalLines =
          dto.quantity > 0
            ? [
                {
                  accountId: inventoryAccountId,
                  debit: amount,
                  credit: 0,
                  description: 'Inventory increase',
                },
                {
                  accountId: adjustmentAccountId,
                  debit: 0,
                  credit: amount,
                  description: 'Inventory adjustment',
                },
              ]
            : [
                {
                  accountId: adjustmentAccountId,
                  debit: amount,
                  credit: 0,
                  description: 'Inventory adjustment',
                },
                {
                  accountId: inventoryAccountId,
                  debit: 0,
                  credit: amount,
                  description: 'Inventory decrease',
                },
              ];

        await this.journalPosterService.post(
          tenantId,
          {
            entryDate: new Date().toISOString().split('T')[0],
            description: `Stock adjustment: ${dto.reason}`,
            referenceId: movementId,
            referenceType: 'stock_adjustment',
            lines: journalLines,
          },
          { userId: auditContext.userId, tenantId },
          transaction,
        );
      } else {
        this.logger.warn(
          `COA settings not configured for tenant ${tenantId}, skipping adjustment journal`,
        );
      }

      // Check low stock after deduction
      if (dto.quantity < 0) {
        const product = await this.productsRepository.findProductReorderInfo(
          tenantId,
          dto.productId,
        );
        if (product && quantityAfter <= product.reorderPoint) {
          await this.outboxService.createEvent({
            tenantId,
            eventType: 'low_stock_alert',
            payload: {
              productId: dto.productId,
              productNameEn: product.nameEn ?? '',
              productNameAr: product.nameAr ?? '',
              warehouseId: dto.warehouseId,
              currentQty: quantityAfter,
              reorderPoint: product.reorderPoint,
              reorderQty: product.reorderPoint - quantityAfter,
            },
            transaction,
          });
        }
      }

      await transaction.commit();

      return {
        id: movementId,
        quantityBefore,
        quantityAfter,
        adjustmentQty: dto.quantity,
        unitCost,
        totalCost,
        averageCost: newAvgCost,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const sequelize = (
      this.stockMovementsRepository as any
    ).tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sm.*, p."nameEn" as "productNameEn", p."nameAr" as "productNameAr", w."nameEn" as "warehouseNameEn", w."nameAr" as "warehouseNameAr"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses w ON w.id = sm."warehouseId"
       WHERE sm."tenantId" = :tenantId AND sm."movementType" = :movementType
       ORDER BY sm."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          tenantId,
          movementType: StockMovementType.ADJUSTMENT,
          limit,
          offset,
        },
      },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_movements
       WHERE "tenantId" = :tenantId AND "movementType" = :movementType`,
      {
        replacements: { tenantId, movementType: StockMovementType.ADJUSTMENT },
      },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const movement = await this.stockMovementsRepository.findById(tenantId, id);
    if (!movement) throw new NotFoundException('Adjustment not found');
    return movement;
  }
}
