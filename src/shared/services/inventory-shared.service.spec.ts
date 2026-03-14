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

  describe('createMovement()', () => {
    it('should increase stock quantity for inbound movement', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
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

    it('should decrease stock quantity for outbound movement', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
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

    it('should throw INSUFFICIENT_STOCK when not enough available for outbound', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
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

    it('should calculate weighted average cost correctly for inbound', async () => {
      // Existing: 10 units at avg cost 5 = 50 total value
      // Inbound: 5 units at cost 8 = 40 inbound value
      // New avg = (50 + 40) / 15 = 6
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue({
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

    it('should commit transaction when owner (no containerTransaction)', async () => {
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue(null);

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
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue(null);

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
  });

  describe('getStockLevel()', () => {
    it('should return stock for specific warehouse', async () => {
      const stockLevel = { productId, warehouseId, quantity: '10' };
      stockLevelsRepository.findByProductAndWarehouse.mockResolvedValue(stockLevel);

      const result = await service.getStockLevel(tenantId, productId, warehouseId);

      expect(result).toEqual([stockLevel]);
      expect(stockLevelsRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        tenantId,
        productId,
        warehouseId,
      );
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
  });

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
  });
});
