jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { InventorySharedService } from './inventory-shared.service';
import { StockMovementType } from '@/common/enums/inventory.enums';
import { CreateMovementDto } from '@/modules/inventory/dto/create-movement.dto';

describe('InventorySharedService', () => {
  let service: InventorySharedService;
  let stockMovementsRepository: Record<string, jest.Mock>;
  let stockLevelsRepository: Record<string, jest.Mock>;
  let productsRepository: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const productId = 'product-001';
  const warehouseId = 'warehouse-001';

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    stockMovementsRepository = {
      getTransaction: jest.fn().mockResolvedValue(mockTransaction),
      create: jest.fn().mockResolvedValue('movement-001'),
    };

    stockLevelsRepository = {
      findByProductAndWarehouse: jest.fn().mockResolvedValue(null),
      findAggregateByProductAndWarehouse: jest.fn().mockResolvedValue(null),
      findStockLevelsByProduct: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue(undefined),
      getSequelize: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue(undefined),
      }),
    };

    productsRepository = {
      findNameById: jest.fn().mockResolvedValue({ nameEn: 'Widget' }),
      findProductReorderInfo: jest.fn().mockResolvedValue(null),
    };

    outboxService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    service = new InventorySharedService(
      stockMovementsRepository as any,
      stockLevelsRepository as any,
      productsRepository as any,
      outboxService as any,
    );
  });

  // ── createMovement ────────────────────────────────────────────────────────

  describe('createMovement()', () => {
    // -- Inbound movements --

    it('should increase stock quantity for PURCHASE_RECEIPT (inbound)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 6,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityBefore).toBe(10);
      expect(result.quantityAfter).toBe(15);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should increase stock for OPENING movement', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.OPENING,
        quantity: 100,
        unitCost: 10,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityBefore).toBe(0);
      expect(result.quantityAfter).toBe(100);
      expect(result.averageCost).toBe(10);
    });

    it('should increase stock for RETURN movement', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '5',
        averageCost: '10',
        reservedQuantity: '0',
        lastCostPrice: '10',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.RETURN,
        quantity: 2,
        unitCost: 10,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(7);
    });

    it('should increase stock for IN movement', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.IN,
        quantity: 3,
        unitCost: 5,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(13);
    });

    it('should treat positive ADJUSTMENT as inbound', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: 5,
        unitCost: 8,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(15);
      // AVCO: (10*5 + 5*8) / 15 = 90/15 = 6
      expect(result.averageCost).toBe(6);
    });

    // -- Outbound movements --

    it('should decrease stock quantity for SALE_DELIVERY (outbound)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '20',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.SALE_DELIVERY,
        quantity: 7,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityBefore).toBe(20);
      expect(result.quantityAfter).toBe(13);
    });

    it('should decrease stock for POS_SALE', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '15',
        averageCost: '10',
        reservedQuantity: '0',
        lastCostPrice: '10',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.POS_SALE,
        quantity: 3,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(12);
      // outbound uses currentAvgCost
      expect(result.unitCost).toBe(10);
    });

    it('should decrease stock for SCRAP movement', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.SCRAP,
        quantity: 2,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(8);
    });

    it('should decrease stock for OUT movement', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.OUT,
        quantity: 4,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(6);
    });

    it('should treat negative ADJUSTMENT as outbound', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '20',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: -3,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(17);
    });

    // -- Insufficient stock --

    it('should throw INSUFFICIENT_STOCK when not enough available for outbound', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '3',
        averageCost: '5',
        reservedQuantity: '1',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.POS_SALE,
        quantity: 5,
      };

      await expect(service.createMovement(tenantId, dto)).rejects.toThrow(BadRequestException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should account for reservedQuantity when checking available stock', async () => {
      // quantity=10, reserved=8, available=2, trying to take 3 -> fail
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '8',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.SALE_DELIVERY,
        quantity: 3,
      };

      await expect(service.createMovement(tenantId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should succeed outbound when quantity equals available (exact)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '5',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.SALE_DELIVERY,
        quantity: 5,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(5);
    });

    // -- AVCO calculations --

    it('should calculate weighted average cost correctly for inbound', async () => {
      // Existing: 10 units at avg cost 5 = 50 total value
      // Inbound: 5 units at cost 8 = 40 inbound value
      // New avg = (50 + 40) / 15 = 6
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 8,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.averageCost).toBe(6);
      expect(result.quantityAfter).toBe(15);
    });

    it('should set avgCost = unitCost when no existing stock (first receipt)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 10,
        unitCost: 12,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.averageCost).toBe(12);
      expect(result.totalCost).toBe(120);
    });

    it('should preserve avgCost for outbound (uses current avg cost)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '20',
        averageCost: '7.5',
        reservedQuantity: '0',
        lastCostPrice: '7.5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.SALE_DELIVERY,
        quantity: 5,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.unitCost).toBe(7.5);
      expect(result.totalCost).toBe(37.5);
      expect(result.averageCost).toBe(7.5);
    });

    // -- INTERNAL movement --

    it('should handle INTERNAL movement type with signed quantity', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '50',
        averageCost: '10',
        reservedQuantity: '0',
        lastCostPrice: '10',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.INTERNAL,
        quantity: -5,
      };

      const result = await service.createMovement(tenantId, dto);

      expect(result.quantityAfter).toBe(45);
      expect(result.unitCost).toBe(10);
    });

    // -- Transaction ownership --

    it('should commit transaction when owner (no containerTransaction)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.OPENING,
        quantity: 10,
        unitCost: 5,
      };

      await service.createMovement(tenantId, dto);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should NOT commit when containerTransaction is provided', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);

      const externalTransaction = { commit: jest.fn(), rollback: jest.fn() };

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.OPENING,
        quantity: 10,
        unitCost: 5,
      };

      await service.createMovement(tenantId, dto, externalTransaction);

      expect(externalTransaction.commit).not.toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should rollback on error when owner', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockRejectedValue(
        new Error('DB error'),
      );

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 10,
      };

      await expect(service.createMovement(tenantId, dto)).rejects.toThrow('DB error');
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should NOT rollback when containerTransaction provided and error occurs', async () => {
      const externalTransaction = { commit: jest.fn(), rollback: jest.fn() };

      stockLevelsRepository.findAggregateByProductAndWarehouse.mockRejectedValue(
        new Error('DB error'),
      );

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 10,
      };

      await expect(service.createMovement(tenantId, dto, externalTransaction)).rejects.toThrow(
        'DB error',
      );
      expect(externalTransaction.rollback).not.toHaveBeenCalled();
    });

    // -- Location-aware operations --

    it('should use findByProductAndWarehouse when locationId is provided (granular)', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
        quantity: '20',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 6,
        locationId: 'loc-001',
      };

      const result = await service.createMovement(tenantId, dto);

      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        productId,
        warehouseId,
        mockTransaction,
        expect.objectContaining({ locationId: 'loc-001' }),
      );
      expect(stockLevelsRepository.findAggregateByProductAndWarehouse).not.toHaveBeenCalled();
      expect(result.quantityAfter).toBe(25);
    });

    it('should use findAggregateByProductAndWarehouse when no granular dimensions', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 6,
      };

      await service.createMovement(tenantId, dto);

      expect(stockLevelsRepository.findAggregateByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        productId,
        warehouseId,
        mockTransaction,
      );
    });

    // -- Product variant operations --

    it('should use granular lookup when productVariantId is provided', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
        quantity: '5',
        averageCost: '10',
        reservedQuantity: '0',
        lastCostPrice: '10',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 3,
        unitCost: 12,
        productVariantId: 'variant-001',
      };

      await service.createMovement(tenantId, dto);

      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        productId,
        warehouseId,
        mockTransaction,
        expect.objectContaining({ productVariantId: 'variant-001' }),
      );
    });

    // -- Lot/serial number tracking --

    it('should use granular lookup when lotNumber is provided', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
        quantity: '0',
        averageCost: '0',
        reservedQuantity: '0',
        lastCostPrice: '0',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 50,
        unitCost: 5,
        lotNumber: 'LOT-2026-01',
      };

      await service.createMovement(tenantId, dto);

      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        productId,
        warehouseId,
        mockTransaction,
        expect.objectContaining({ lotNumber: 'LOT-2026-01' }),
      );
    });

    it('should use granular lookup when serialNumber is provided', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue(null);

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 1,
        unitCost: 500,
        serialNumber: 'SN-12345',
      };

      await service.createMovement(tenantId, dto);

      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        productId,
        warehouseId,
        mockTransaction,
        expect.objectContaining({ serialNumber: 'SN-12345' }),
      );
    });

    it('should pass locationId and productVariantId to stock level upsert', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue(null);

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 10,
        unitCost: 5,
        locationId: 'loc-001',
        productVariantId: 'var-001',
        lotNumber: 'LOT-1',
        serialNumber: 'SN-1',
      };

      await service.createMovement(tenantId, dto);

      expect(stockLevelsRepository.upsert).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId,
          warehouseId,
          locationId: 'loc-001',
          productVariantId: 'var-001',
          lotNumber: 'LOT-1',
          serialNumber: 'SN-1',
        }),
        mockTransaction,
      );
    });

    // -- Low stock alert --

    it('should trigger low stock alert when delta < 0 and qty <= reorderPoint', async () => {
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

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.SALE_DELIVERY,
        quantity: 5,
      };

      await service.createMovement(tenantId, dto);

      // quantityAfter = 5, reorderPoint = 8, so alert should fire
      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          eventType: 'low_stock_alert',
        }),
      );
    });

    it('should NOT trigger low stock alert when delta > 0 (inbound)', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 10,
        unitCost: 5,
      };

      await service.createMovement(tenantId, dto);

      expect(productsRepository.findProductReorderInfo).not.toHaveBeenCalled();
    });

    // -- Stock movement record --

    it('should record movement with correct fields', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue({
        quantity: '10',
        averageCost: '5',
        reservedQuantity: '0',
        lastCostPrice: '5',
      });

      const dto: CreateMovementDto = {
        productId,
        warehouseId,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 8,
        notes: 'PO-001 receipt',
        referenceId: 'po-001',
        referenceType: 'purchase_order' as any,
        branchId: 'branch-001',
      };

      await service.createMovement(tenantId, dto);

      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId,
          warehouseId,
          movementType: StockMovementType.PURCHASE_RECEIPT,
          quantity: 5,
          quantityBefore: 10,
          quantityAfter: 15,
          notes: 'PO-001 receipt',
          referenceId: 'po-001',
          branchId: 'branch-001',
        }),
        mockTransaction,
      );
    });
  });

  // ── getStockLevel ──────────────────────────────────────────────────────────

  describe('getStockLevel()', () => {
    it('should return stock for specific warehouse using aggregate lookup', async () => {
      const stockLevel = { productId, warehouseId, quantity: '10' };
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(stockLevel);

      const result = await service.getStockLevel(tenantId, productId, warehouseId);

      expect(result).toEqual([stockLevel]);
      expect(stockLevelsRepository.findAggregateByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        productId,
        warehouseId,
      );
    });

    it('should return empty array when no stock for warehouse', async () => {
      stockLevelsRepository.findAggregateByProductAndWarehouse.mockResolvedValue(null);

      const result = await service.getStockLevel(tenantId, productId, warehouseId);

      expect(result).toEqual([]);
    });

    it('should return all warehouses when no warehouseId', async () => {
      const levels = [
        { productId, warehouseId: 'wh-1', quantity: '10' },
        { productId, warehouseId: 'wh-2', quantity: '5' },
      ];
      stockLevelsRepository.findStockLevelsByProduct.mockResolvedValue(levels);

      const result = await service.getStockLevel(tenantId, productId);

      expect(result).toEqual(levels);
      expect(stockLevelsRepository.findStockLevelsByProduct).toHaveBeenCalledWith(
        tenantId,
        productId,
      );
    });
  });

  // ── reserveStock ──────────────────────────────────────────────────────────

  describe('reserveStock()', () => {
    it('should atomically increment reservedQuantity', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });

      await service.reserveStock(tenantId, productId, warehouseId, 3);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, options] = mockQuery.mock.calls[0];
      expect(sql).toContain('"reservedQuantity" = "reservedQuantity" + :qty');
      expect(options.replacements.qty).toBe(3);
      expect(options.replacements.productId).toBe(productId);
      expect(options.replacements.warehouseId).toBe(warehouseId);
      expect(options.replacements.tenantId).toBe(tenantId);
    });

    it('should include locationId in WHERE clause when provided', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });

      await service.reserveStock(tenantId, productId, warehouseId, 5, undefined, {
        locationId: 'loc-001',
      });

      const [sql, options] = mockQuery.mock.calls[0];
      expect(sql).toContain('"locationId" = :locationId');
      expect(options.replacements.locationId).toBe('loc-001');
    });

    it('should include productVariantId in WHERE clause when provided', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });

      await service.reserveStock(tenantId, productId, warehouseId, 2, undefined, {
        productVariantId: 'var-001',
      });

      const [sql, options] = mockQuery.mock.calls[0];
      expect(sql).toContain('"productVariantId" = :productVariantId');
      expect(options.replacements.productVariantId).toBe('var-001');
    });

    it('should pass containerTransaction when provided', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });
      const externalTx = { commit: jest.fn(), rollback: jest.fn() };

      await service.reserveStock(tenantId, productId, warehouseId, 3, externalTx);

      const [, options] = mockQuery.mock.calls[0];
      expect(options.transaction).toBe(externalTx);
    });
  });

  // ── releaseReservation ────────────────────────────────────────────────────

  describe('releaseReservation()', () => {
    it('should atomically decrement reservedQuantity, never below zero', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });

      await service.releaseReservation(tenantId, productId, warehouseId, 2);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, options] = mockQuery.mock.calls[0];
      expect(sql).toContain('GREATEST(0, "reservedQuantity" - :qty)');
      expect(options.replacements.qty).toBe(2);
    });

    it('should include locationId in WHERE clause when provided', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });

      await service.releaseReservation(tenantId, productId, warehouseId, 1, undefined, {
        locationId: 'loc-002',
      });

      const [sql, options] = mockQuery.mock.calls[0];
      expect(sql).toContain('"locationId" = :locationId');
      expect(options.replacements.locationId).toBe('loc-002');
    });

    it('should include productVariantId in WHERE clause when provided', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });

      await service.releaseReservation(tenantId, productId, warehouseId, 1, undefined, {
        productVariantId: 'var-002',
      });

      const [sql, options] = mockQuery.mock.calls[0];
      expect(sql).toContain('"productVariantId" = :productVariantId');
      expect(options.replacements.productVariantId).toBe('var-002');
    });

    it('should pass containerTransaction when provided', async () => {
      const mockQuery = jest.fn();
      stockLevelsRepository.getSequelize.mockReturnValue({ query: mockQuery });
      const externalTx = { commit: jest.fn(), rollback: jest.fn() };

      await service.releaseReservation(tenantId, productId, warehouseId, 2, externalTx);

      const [, options] = mockQuery.mock.calls[0];
      expect(options.transaction).toBe(externalTx);
    });
  });
});
