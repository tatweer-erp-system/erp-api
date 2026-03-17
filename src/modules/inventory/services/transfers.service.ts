import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { StockMovementsRepository } from '@/database/sql/repositories/stock-movements.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import {
  StockMovementType,
  StockReferenceType,
  StockOriginModel,
} from '@/common/enums/inventory.enums';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly outboxService: OutboxSharedService,
    private readonly journalPosterService: JournalPosterSharedService,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
  ) {}

  async create(tenantId: string, dto: CreateTransferDto, auditContext: AuditContext) {
    const transaction = await this.stockMovementsRepository.getTransaction(tenantId);

    try {
      // Get product name for error messages
      const product = await this.productsRepository.findNameById(
        tenantId,
        dto.productId,
        transaction,
      );
      const productName = product?.nameEn ?? dto.productId;

      // Build stock lookup options for source
      const sourceLookupOptions = {
        locationId: dto.fromLocationId ?? null,
        productVariantId: dto.productVariantId ?? null,
        lotNumber: dto.lotNumber ?? null,
        serialNumber: dto.serialNumber ?? null,
      };

      const hasGranularDimensions = !!(
        dto.fromLocationId ||
        dto.productVariantId ||
        dto.lotNumber ||
        dto.serialNumber
      );

      // Get source stock level (location-aware if dimensions provided)
      const sourceLevel = hasGranularDimensions
        ? await this.stockLevelsRepository.findByProductAndWarehouse(
            tenantId,
            dto.productId,
            dto.sourceWarehouseId,
            transaction,
            sourceLookupOptions,
          )
        : await this.stockLevelsRepository.findAggregateByProductAndWarehouse(
            tenantId,
            dto.productId,
            dto.sourceWarehouseId,
            transaction,
          );

      const sourceQty = parseFloat(sourceLevel?.quantity ?? '0');
      const sourceReserved = parseFloat(sourceLevel?.reservedQuantity ?? '0');
      const available = sourceQty - sourceReserved;
      const sourceAvgCost = parseFloat(sourceLevel?.averageCost ?? '0');

      // Check available stock
      if (dto.quantity > available) {
        throw new BadRequestException(
          msg(ErrorMessages.TRANSFER_INSUFFICIENT_STOCK, productName, available, dto.quantity),
        );
      }

      const sourceQtyBefore = sourceQty;
      const sourceQtyAfter = sourceQty - dto.quantity;
      const unitCost = sourceAvgCost;
      const totalCost = dto.quantity * unitCost;

      // Deduct from source warehouse (location-aware)
      await this.stockLevelsRepository.upsert(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.sourceWarehouseId,
          quantity: sourceQtyAfter,
          averageCost: sourceAvgCost,
          locationId: dto.fromLocationId ?? null,
          productVariantId: dto.productVariantId ?? null,
          lotNumber: dto.lotNumber ?? null,
          serialNumber: dto.serialNumber ?? null,
          expiryDate: dto.expiryDate ?? null,
        },
        transaction,
      );

      // Record source (outgoing) movement with location references
      const sourceMovementId = await this.stockMovementsRepository.create(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.sourceWarehouseId,
          movementType: StockMovementType.INTERNAL,
          quantity: -dto.quantity,
          quantityBefore: sourceQtyBefore,
          quantityAfter: sourceQtyAfter,
          notes: dto.notes ?? `Transfer to warehouse`,
          referenceId: null,
          referenceType: StockReferenceType.TRANSFER,
          createdBy: auditContext.userId ?? null,
          unitCost,
          totalCost,
          fromLocationId: dto.fromLocationId ?? null,
          toLocationId: dto.toLocationId ?? null,
          productVariantId: dto.productVariantId ?? null,
          lotNumber: dto.lotNumber ?? null,
          serialNumber: dto.serialNumber ?? null,
          expiryDate: dto.expiryDate ?? null,
          originModel: StockOriginModel.TRANSFER,
          originId: null,
        },
        transaction,
      );

      // Build destination lookup options
      const destLookupOptions = {
        locationId: dto.toLocationId ?? null,
        productVariantId: dto.productVariantId ?? null,
        lotNumber: dto.lotNumber ?? null,
        serialNumber: dto.serialNumber ?? null,
      };

      const destHasGranular = !!(
        dto.toLocationId ||
        dto.productVariantId ||
        dto.lotNumber ||
        dto.serialNumber
      );

      // Get destination stock level (location-aware if dimensions provided)
      const destLevel = destHasGranular
        ? await this.stockLevelsRepository.findByProductAndWarehouse(
            tenantId,
            dto.productId,
            dto.destinationWarehouseId,
            transaction,
            destLookupOptions,
          )
        : await this.stockLevelsRepository.findAggregateByProductAndWarehouse(
            tenantId,
            dto.productId,
            dto.destinationWarehouseId,
            transaction,
          );

      const destQtyBefore = parseFloat(destLevel?.quantity ?? '0');
      const destAvgCost = parseFloat(destLevel?.averageCost ?? '0');
      const destQtyAfter = destQtyBefore + dto.quantity;

      // Weighted average for destination
      const totalDestValue = destQtyBefore * destAvgCost;
      const incomingValue = dto.quantity * unitCost;
      const newDestAvgCost =
        destQtyAfter > 0 ? (totalDestValue + incomingValue) / destQtyAfter : unitCost;

      // Add to destination warehouse (location-aware)
      await this.stockLevelsRepository.upsert(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.destinationWarehouseId,
          quantity: destQtyAfter,
          averageCost: newDestAvgCost,
          locationId: dto.toLocationId ?? null,
          productVariantId: dto.productVariantId ?? null,
          lotNumber: dto.lotNumber ?? null,
          serialNumber: dto.serialNumber ?? null,
          expiryDate: dto.expiryDate ?? null,
        },
        transaction,
      );

      // Record destination (incoming) movement with location references
      const destMovementId = await this.stockMovementsRepository.create(
        tenantId,
        {
          productId: dto.productId,
          warehouseId: dto.destinationWarehouseId,
          movementType: StockMovementType.INTERNAL,
          quantity: dto.quantity,
          quantityBefore: destQtyBefore,
          quantityAfter: destQtyAfter,
          notes: dto.notes ?? `Transfer from warehouse`,
          referenceId: sourceMovementId,
          referenceType: StockReferenceType.TRANSFER,
          createdBy: auditContext.userId ?? null,
          unitCost,
          totalCost,
          fromLocationId: dto.fromLocationId ?? null,
          toLocationId: dto.toLocationId ?? null,
          productVariantId: dto.productVariantId ?? null,
          lotNumber: dto.lotNumber ?? null,
          serialNumber: dto.serialNumber ?? null,
          expiryDate: dto.expiryDate ?? null,
          originModel: StockOriginModel.TRANSFER,
          originId: sourceMovementId,
        },
        transaction,
      );

      // Post audit journal entry for internal transfer
      const inventorySettingRow = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        'coaInventory',
      );
      const inventoryAccountId = inventorySettingRow?.value ?? null;

      if (inventoryAccountId) {
        await this.journalPosterService.post(
          tenantId,
          {
            entryDate: new Date().toISOString().split('T')[0],
            description: `Internal transfer: ${dto.quantity} units of ${productName}`,
            referenceId: sourceMovementId,
            referenceType: 'stock_transfer',
            lines: [
              {
                accountId: inventoryAccountId,
                debit: totalCost,
                credit: 0,
                description: `In: destination warehouse`,
              },
              {
                accountId: inventoryAccountId,
                debit: 0,
                credit: totalCost,
                description: `Out: source warehouse`,
              },
            ],
          },
          { userId: auditContext.userId, tenantId },
          transaction,
        );
      } else {
        this.logger.warn(
          `coaInventory not configured for tenant ${tenantId}, skipping transfer journal`,
        );
      }

      // Check low stock at source after deduction
      const productInfo = await this.productsRepository.findProductReorderInfo(
        tenantId,
        dto.productId,
      );
      if (productInfo && sourceQtyAfter <= productInfo.reorderPoint) {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'low_stock_alert',
          payload: {
            productId: dto.productId,
            productNameEn: productInfo.nameEn ?? '',
            productNameAr: productInfo.nameAr ?? '',
            warehouseId: dto.sourceWarehouseId,
            currentQty: sourceQtyAfter,
            reorderPoint: productInfo.reorderPoint,
            reorderQty: productInfo.reorderPoint - sourceQtyAfter,
          },
          transaction,
        });
      }

      await transaction.commit();

      return {
        sourceMovementId,
        destinationMovementId: destMovementId,
        sourceWarehouseId: dto.sourceWarehouseId,
        destinationWarehouseId: dto.destinationWarehouseId,
        quantity: dto.quantity,
        sourceQtyBefore,
        sourceQtyAfter,
        destQtyBefore,
        destQtyAfter,
        fromLocationId: dto.fromLocationId ?? null,
        toLocationId: dto.toLocationId ?? null,
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
      `SELECT sm.*, p."nameEn" as "productNameEn", p."nameAr" as "productNameAr",
              w."nameEn" as "warehouseNameEn", w."nameAr" as "warehouseNameAr",
              fl."nameEn" as "fromLocationNameEn", tl."nameEn" as "toLocationNameEn"
       FROM stock_movements sm
       JOIN products p ON p.id = sm."productId"
       JOIN warehouses w ON w.id = sm."warehouseId"
       LEFT JOIN stock_locations fl ON fl.id = sm."fromLocationId"
       LEFT JOIN stock_locations tl ON tl.id = sm."toLocationId"
       WHERE sm."tenantId" = :tenantId AND sm."movementType" = :movementType
       ORDER BY sm."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          tenantId,
          movementType: StockMovementType.INTERNAL,
          limit,
          offset,
        },
      },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM stock_movements
       WHERE "tenantId" = :tenantId AND "movementType" = :movementType`,
      {
        replacements: { tenantId, movementType: StockMovementType.INTERNAL },
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
    if (!movement) throw new NotFoundException('Transfer not found');
    return movement;
  }
}
