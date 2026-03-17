jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import {
  StockMovementType,
  StockReferenceType,
  StockOriginModel,
} from '@/common/enums/inventory.enums';

describe('TransfersService', () => {
  let service: TransfersService;
  let stockMovementsRepository: Record<string, jest.Mock>;
  let stockLevelsRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;
  let journalPosterService: Record<string, jest.Mock>;
  let tenantSettingsRepository: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001', tenantId };

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    stockMovementsRepository = {
      getTransaction: jest.fn().mockResolvedValue(mockTransaction),
      create: jest.fn().mockResolvedValueOnce('source-mv-001').mockResolvedValueOnce('dest-mv-001'),
      findById: jest.fn().mockResolvedValue(null),
    };

    (stockMovementsRepository as any).tenantSequelizeService = {
      getSharedSequelize: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue([[]]),
      }),
    };

    stockLevelsRepository = {
      findByProductAndWarehouse: jest.fn().mockResolvedValue(null),
      findAggregateByProductAndWarehouse: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
    };

    productsRepository = {
      findNameById: jest.fn().mockResolvedValue({ nameEn: 'Widget' }),
      findProductReorderInfo: jest.fn().mockResolvedValue(null),
    };

    outboxService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    journalPosterService = {
      post: jest.fn().mockResolvedValue(undefined),
    };

    tenantSettingsRepository = {
      findByKeyTenant: jest.fn().mockResolvedValue(null),
    };

    service = new TransfersService(
      stockMovementsRepository as any,
      stockLevelsRepository as any,
      productsRepository as any,
      outboxService as any,
      journalPosterService as any,
      tenantSettingsRepository as any,
    );
  });

  // ── create — basic transfer ───────────────────────────────────────────────

  describe('create() — basic transfer between warehouses', () => {
    const baseDto = {
      productId: 'p1',
      sourceWarehouseId: 'wh-src',
      destinationWarehouseId: 'wh-dest',
      quantity: 10,
    };

    beforeEach(() => {
      // Source warehouse has stock
      stockLevelsRepository.findAggregateByProductAndWarehouse
        .mockResolvedValueOnce({
          quantity: '50',
          averageCost: '10',
          reservedQuantity: '0',
          lastCostPrice: '10',
        })
        // Destination warehouse (second call)
        .mockResolvedValueOnce({
          quantity: '20',
          averageCost: '8',
          reservedQuantity: '0',
          lastCostPrice: '8',
        });
    });

    it('should deduct from source and add to destination', async () => {
      const result = await service.create(tenantId, baseDto as any, auditContext);

      expect(result.sourceQtyBefore).toBe(50);
      expect(result.sourceQtyAfter).toBe(40);
      expect(result.destQtyBefore).toBe(20);
      expect(result.destQtyAfter).toBe(30);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should create two stock movements (source outgoing + destination incoming)', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(stockMovementsRepository.create).toHaveBeenCalledTimes(2);

      // Source movement: negative quantity
      expect(stockMovementsRepository.create).toHaveBeenNthCalledWith(
        1,
        tenantId,
        expect.objectContaining({
          warehouseId: 'wh-src',
          movementType: StockMovementType.INTERNAL,
          quantity: -10,
          referenceType: StockReferenceType.TRANSFER,
          originModel: StockOriginModel.TRANSFER,
        }),
        mockTransaction,
      );

      // Destination movement: positive quantity
      expect(stockMovementsRepository.create).toHaveBeenNthCalledWith(
        2,
        tenantId,
        expect.objectContaining({
          warehouseId: 'wh-dest',
          movementType: StockMovementType.INTERNAL,
          quantity: 10,
          referenceType: StockReferenceType.TRANSFER,
          originModel: StockOriginModel.TRANSFER,
        }),
        mockTransaction,
      );
    });

    it('should upsert both source and destination stock levels', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(stockLevelsRepository.upsert).toHaveBeenCalledTimes(2);

      // Source upsert: decreased
      expect(stockLevelsRepository.upsert).toHaveBeenNthCalledWith(
        1,
        tenantId,
        expect.objectContaining({
          warehouseId: 'wh-src',
          quantity: 40,
        }),
        mockTransaction,
      );

      // Destination upsert: increased
      expect(stockLevelsRepository.upsert).toHaveBeenNthCalledWith(
        2,
        tenantId,
        expect.objectContaining({
          warehouseId: 'wh-dest',
          quantity: 30,
        }),
        mockTransaction,
      );
    });

    it('should calculate AVCO at destination correctly', async () => {
      // Dest: 20 @ 8 = 160; Incoming: 10 @ 10 (source avgCost) = 100
      // New avg = 260 / 30 = 8.6667
      await service.create(tenantId, baseDto as any, auditContext);

      expect(stockLevelsRepository.upsert).toHaveBeenNthCalledWith(
        2,
        tenantId,
        expect.objectContaining({
          averageCost: expect.closeTo(8.6667, 3),
        }),
        mockTransaction,
      );
    });
  });

  // ── Insufficient stock ────────────────────────────────────────────────────

  describe('create() — insufficient stock', () => {
    it('should throw when source has insufficient available stock', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '5',
        averageCost: '10',
        reservedQuantity: '2',
        lastCostPrice: '10',
      });

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5, // available = 5-2=3, requesting 5
      };

      await expect(service.create(tenantId, dto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should succeed when quantity equals available stock', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse
        .mockResolvedValueOnce({
          quantity: '10',
          averageCost: '5',
          reservedQuantity: '5',
          lastCostPrice: '5',
        })
        .mockResolvedValueOnce(null);

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5, // available = 10-5=5, requesting 5
      };

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(result.sourceQtyAfter).toBe(5);
    });
  });

  // ── Location-aware transfers ──────────────────────────────────────────────

  describe('create() — location-aware', () => {
    it('should use granular lookup when fromLocationId is provided', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValueOnce({
        quantity: '50',
        averageCost: '10',
        reservedQuantity: '0',
        lastCostPrice: '10',
      });
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValueOnce(null);

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5,
        fromLocationId: 'loc-src',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        'p1',
        'wh-src',
        mockTransaction,
        expect.objectContaining({ locationId: 'loc-src' }),
      );
    });

    it('should pass fromLocationId and toLocationId to movements', async () => {
      stockLevelsRepository.findByProductAndWarehouse
        .mockResolvedValueOnce({
          quantity: '50',
          averageCost: '10',
          reservedQuantity: '0',
          lastCostPrice: '10',
        })
        .mockResolvedValueOnce(null);

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5,
        fromLocationId: 'loc-src',
        toLocationId: 'loc-dest',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockMovementsRepository.create).toHaveBeenNthCalledWith(
        1,
        tenantId,
        expect.objectContaining({
          fromLocationId: 'loc-src',
          toLocationId: 'loc-dest',
        }),
        mockTransaction,
      );
    });

    it('should include productVariantId and lotNumber in transfer', async () => {
      stockLevelsRepository.findByProductAndWarehouse
        .mockResolvedValueOnce({
          quantity: '30',
          averageCost: '10',
          reservedQuantity: '0',
          lastCostPrice: '10',
        })
        .mockResolvedValueOnce(null);

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5,
        productVariantId: 'var-001',
        lotNumber: 'LOT-A',
        fromLocationId: 'loc-1',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLevelsRepository.upsert).toHaveBeenNthCalledWith(
        1,
        tenantId,
        expect.objectContaining({
          productVariantId: 'var-001',
          lotNumber: 'LOT-A',
        }),
        mockTransaction,
      );
    });
  });

  // ── Journal entry ─────────────────────────────────────────────────────────

  describe('create() — journal entry', () => {
    it('should post journal when coaInventory is configured', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse
        .mockResolvedValueOnce({
          quantity: '50',
          averageCost: '10',
          reservedQuantity: '0',
          lastCostPrice: '10',
        })
        .mockResolvedValueOnce(null);

      tenantSettingsRepository.findByKeyTenant.mockResolvedValue({ value: 'acc-inv' });

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5,
      };

      await service.create(tenantId, dto as any, auditContext);

      // totalCost = 5 * 10 = 50
      expect(journalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          referenceType: 'stock_transfer',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-inv', debit: 50, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-inv', debit: 0, credit: 50 }),
          ]),
        }),
        expect.any(Object),
        mockTransaction,
      );
    });

    it('should skip journal when coaInventory not configured', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse
        .mockResolvedValueOnce({
          quantity: '50',
          averageCost: '10',
          reservedQuantity: '0',
          lastCostPrice: '10',
        })
        .mockResolvedValueOnce(null);

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5,
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(journalPosterService.post).not.toHaveBeenCalled();
    });
  });

  // ── Low stock alert at source ─────────────────────────────────────────────

  describe('create() — low stock alert', () => {
    it('should emit low stock alert when source drops below reorder point', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse
        .mockResolvedValueOnce({
          quantity: '12',
          averageCost: '10',
          reservedQuantity: '0',
          lastCostPrice: '10',
        })
        .mockResolvedValueOnce(null);

      productsRepository.findProductReorderInfo.mockResolvedValue({
        nameEn: 'Widget',
        nameAr: 'قطعة',
        reorderPoint: 10,
      });

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5,
      };

      await service.create(tenantId, dto as any, auditContext);

      // sourceQtyAfter = 7, reorderPoint = 10
      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'low_stock_alert',
          payload: expect.objectContaining({
            productId: 'p1',
            currentQty: 7,
          }),
        }),
      );
    });
  });

  // ── Rollback ──────────────────────────────────────────────────────────────

  describe('create() — error handling', () => {
    it('should rollback on error', async () => {
      productsRepository.findNameById.mockRejectedValue(new Error('DB error'));

      const dto = {
        productId: 'p1',
        sourceWarehouseId: 'wh-src',
        destinationWarehouseId: 'wh-dest',
        quantity: 5,
      };

      await expect(service.create(tenantId, dto as any, auditContext)).rejects.toThrow('DB error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the movement', async () => {
      const movement = { id: 'mv-1' };
      stockMovementsRepository.findById.mockResolvedValue(movement);

      const result = await service.findById(tenantId, 'mv-1');

      expect(result).toBe(movement);
    });

    it('should throw NotFoundException when not found', async () => {
      stockMovementsRepository.findById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'bad')).rejects.toThrow(NotFoundException);
    });
  });
});
