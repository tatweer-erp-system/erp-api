jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { NotFoundException } from '@nestjs/common';
import { AdjustmentsService } from './adjustments.service';
import {
  StockMovementType,
  StockReferenceType,
  StockOriginModel,
} from '@/common/enums/inventory.enums';

describe('AdjustmentsService', () => {
  let service: AdjustmentsService;
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
      create: jest.fn().mockResolvedValue('movement-001'),
      findById: jest.fn().mockResolvedValue(null),
    };

    // mock the sequelize accessor used by findAll
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

    service = new AdjustmentsService(
      stockMovementsRepository as any,
      stockLevelsRepository as any,
      productsRepository as any,
      outboxService as any,
      journalPosterService as any,
      tenantSettingsRepository as any,
    );
  });

  // ── create (positive adjustment) ──────────────────────────────────────────

  describe('create() — positive adjustment (increase)', () => {
    it('should increase stock and return correct quantities', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 5,
        reason: 'Found extra stock',
        unitCost: 8,
      };

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(result.quantityBefore).toBe(10);
      expect(result.quantityAfter).toBe(15);
      expect(result.adjustmentQty).toBe(5);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should calculate AVCO for positive adjustment', async () => {
      // Existing: 10 @ 5 = 50; Adding: 5 @ 8 = 40; New avg = 90/15 = 6
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 5,
        reason: 'Recount',
        unitCost: 8,
      };

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(result.averageCost).toBe(6);
    });

    it('should upsert stock level with new quantity and avgCost', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 5,
        reason: 'Increase',
        unitCost: 8,
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLevelsRepository.upsert).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId: 'p1',
          warehouseId: 'wh1',
          quantity: 15,
          averageCost: 6,
          lastCostPrice: 8,
        }),
        mockTransaction,
      );
    });
  });

  // ── create (negative adjustment) ──────────────────────────────────────────

  describe('create() — negative adjustment (decrease)', () => {
    it('should decrease stock and use currentAvgCost as unitCost', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '20',
        averageCost: '10',
        reservedQuantity: '0',
        lastCostPrice: '10',
      });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: -5,
        reason: 'Damaged stock',
      };

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(result.quantityBefore).toBe(20);
      expect(result.quantityAfter).toBe(15);
      expect(result.unitCost).toBe(10);
      expect(result.totalCost).toBe(50);
    });

    it('should trigger low stock alert if below reorder point', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      productsRepository.findProductReorderInfo.mockResolvedValue({
        nameEn: 'Widget',
        nameAr: 'قطعة',
        reorderPoint: 8,
      });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: -5,
        reason: 'Shrinkage',
      };

      await service.create(tenantId, dto as any, auditContext);

      // quantityAfter = 5, reorderPoint = 8
      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'low_stock_alert',
          payload: expect.objectContaining({
            productId: 'p1',
            currentQty: 5,
            reorderPoint: 8,
          }),
        }),
      );
    });

    it('should NOT trigger low stock alert if above reorder point', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '20',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      productsRepository.findProductReorderInfo.mockResolvedValue({
        nameEn: 'Widget',
        nameAr: 'قطعة',
        reorderPoint: 5,
      });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: -3,
        reason: 'Minor shrinkage',
      };

      await service.create(tenantId, dto as any, auditContext);

      // quantityAfter = 17, reorderPoint = 5
      expect(outboxService.createEvent).not.toHaveBeenCalled();
    });
  });

  // ── Location-aware adjustments ────────────────────────────────────────────

  describe('create() — location-aware', () => {
    it('should use granular stock lookup when locationId provided', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 3,
        reason: 'Location count',
        unitCost: 5,
        locationId: 'loc-001',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        'p1',
        'wh1',
        mockTransaction,
        expect.objectContaining({ locationId: 'loc-001' }),
      );
      expect(stockLevelsRepository.findAggregateByProductAndWarehouse).not.toHaveBeenCalled();
    });

    it('should use granular lookup when productVariantId provided', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue(null);

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 5,
        reason: 'Variant adjust',
        unitCost: 10,
        productVariantId: 'var-001',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        'p1',
        'wh1',
        mockTransaction,
        expect.objectContaining({ productVariantId: 'var-001' }),
      );
    });

    it('should pass locationId and productVariantId to upsert', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue(null);

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 10,
        reason: 'Initial count',
        unitCost: 5,
        locationId: 'loc-001',
        productVariantId: 'var-001',
        lotNumber: 'LOT-1',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLevelsRepository.upsert).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          locationId: 'loc-001',
          productVariantId: 'var-001',
          lotNumber: 'LOT-1',
        }),
        mockTransaction,
      );
    });

    it('should set fromLocationId for negative and toLocationId for positive adjustments', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      // Negative: fromLocationId should be the locationId
      const dtoNeg = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: -2,
        reason: 'Remove from location',
        locationId: 'loc-001',
      };

      await service.create(tenantId, dtoNeg as any, auditContext);

      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          fromLocationId: 'loc-001',
          toLocationId: null,
        }),
        mockTransaction,
      );
    });
  });

  // ── Journal entry creation ────────────────────────────────────────────────

  describe('create() — journal entry', () => {
    it('should post journal entry when COA settings are configured (increase)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      tenantSettingsRepository.findByKeyTenant
        .mockResolvedValueOnce({ value: 'acc-inventory' })
        .mockResolvedValueOnce({ value: 'acc-adjustment' });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 5,
        reason: 'Found stock',
        unitCost: 8,
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(journalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          referenceType: 'stock_adjustment',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-inventory', debit: 40, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-adjustment', debit: 0, credit: 40 }),
          ]),
        }),
        expect.objectContaining({ userId: 'user-001' }),
        mockTransaction,
      );
    });

    it('should skip journal entry when COA settings not configured', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);
      tenantSettingsRepository.findByKeyTenant.mockResolvedValue(null);

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 5,
        reason: 'Recount',
        unitCost: 10,
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(journalPosterService.post).not.toHaveBeenCalled();
    });

    it('should post debit adjustment / credit inventory for decrease', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '20',
        averageCost: '10',
        reservedQuantity: '0',
        lastCostPrice: '10',
      });

      tenantSettingsRepository.findByKeyTenant
        .mockResolvedValueOnce({ value: 'acc-inventory' })
        .mockResolvedValueOnce({ value: 'acc-adjustment' });

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: -3,
        reason: 'Damaged',
      };

      await service.create(tenantId, dto as any, auditContext);

      // amount = 3 * 10 (currentAvgCost) = 30
      expect(journalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-adjustment', debit: 30, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-inventory', debit: 0, credit: 30 }),
          ]),
        }),
        expect.any(Object),
        mockTransaction,
      );
    });
  });

  // ── Stock movement record ─────────────────────────────────────────────────

  describe('create() — movement record', () => {
    it('should record movement with ADJUSTMENT type and ADJUSTMENT referenceType', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 10,
        reason: 'Opening stock',
        unitCost: 5,
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          movementType: StockMovementType.ADJUSTMENT,
          referenceType: StockReferenceType.ADJUSTMENT,
          originModel: StockOriginModel.ADJUSTMENT,
          notes: 'Opening stock',
          quantityBefore: 0,
          quantityAfter: 10,
        }),
        mockTransaction,
      );
    });
  });

  // ── Transaction rollback ──────────────────────────────────────────────────

  describe('create() — error handling', () => {
    it('should rollback transaction on error', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockRejectedValue(
        new Error('DB error'),
      );

      const dto = {
        productId: 'p1',
        warehouseId: 'wh1',
        quantity: 5,
        reason: 'Test',
      };

      await expect(service.create(tenantId, dto as any, auditContext)).rejects.toThrow('DB error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return movement when found', async () => {
      const movement = { id: 'mv-1', movementType: StockMovementType.ADJUSTMENT };
      stockMovementsRepository.findById.mockResolvedValue(movement);

      const result = await service.findById(tenantId, 'mv-1');

      expect(result).toBe(movement);
    });

    it('should throw NotFoundException when not found', async () => {
      stockMovementsRepository.findById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
