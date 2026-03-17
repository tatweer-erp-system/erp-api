jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { LocationType } from '@/common/enums/inventory-new.enums';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let warehousesRepository: Record<string, jest.Mock>;
  let stockLocationsRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001', tenantId };

  beforeEach(() => {
    warehousesRepository = {
      findAll: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue('wh-new'),
      update: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
      findForDropdown: jest.fn().mockResolvedValue([]),
    };

    stockLocationsRepository = {
      insertStockLocation: jest.fn().mockResolvedValue('loc-new'),
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    };

    service = new WarehousesService(warehousesRepository as any, stockLocationsRepository as any);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    beforeEach(() => {
      warehousesRepository.findById.mockResolvedValue({
        id: 'wh-new',
        nameEn: 'Main',
        nameAr: 'رئيسي',
      });
    });

    it('should create warehouse and return it', async () => {
      const dto = { nameEn: 'Main', nameAr: 'رئيسي' };

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(warehousesRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ nameEn: 'Main', nameAr: 'رئيسي' }),
      );
      expect(result.id).toBe('wh-new');
    });

    it('should auto-create 3 default stock locations', async () => {
      const dto = { nameEn: 'Warehouse A', nameAr: 'مستودع أ' };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledTimes(3);
    });

    it('should create Internal location (INTERNAL type)', async () => {
      const dto = { nameEn: 'Warehouse A', nameAr: 'مستودع أ' };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          nameEn: 'Internal',
          nameAr: 'داخلي',
          locationType: LocationType.INTERNAL,
          warehouseId: 'wh-new',
          isScrap: false,
          isReturn: false,
          isActive: true,
        }),
      );
    });

    it('should create Input location (SUPPLIER type)', async () => {
      const dto = { nameEn: 'Warehouse A', nameAr: 'مستودع أ' };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          nameEn: 'Input',
          nameAr: 'استلام',
          locationType: LocationType.SUPPLIER,
          warehouseId: 'wh-new',
        }),
      );
    });

    it('should create Output location (CUSTOMER type)', async () => {
      const dto = { nameEn: 'Warehouse A', nameAr: 'مستودع أ' };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          nameEn: 'Output',
          nameAr: 'إرسال',
          locationType: LocationType.CUSTOMER,
          warehouseId: 'wh-new',
        }),
      );
    });

    it('should set fullName as "WarehouseName / LocationName"', async () => {
      const dto = { nameEn: 'Central', nameAr: 'مركزي' };

      await service.create(tenantId, dto as any, auditContext);

      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ fullName: 'Central / Internal' }),
      );
      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ fullName: 'Central / Input' }),
      );
      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ fullName: 'Central / Output' }),
      );
    });

    it('should not fail if one location creation fails (logs warning)', async () => {
      stockLocationsRepository.insertStockLocation
        .mockResolvedValueOnce('loc-1')
        .mockRejectedValueOnce(new Error('duplicate'))
        .mockResolvedValueOnce('loc-3');

      const dto = { nameEn: 'WH', nameAr: 'مستودع' };

      // Should not throw
      const result = await service.create(tenantId, dto as any, auditContext);

      expect(result).toBeDefined();
      expect(stockLocationsRepository.insertStockLocation).toHaveBeenCalledTimes(3);
    });

    it('should build location from address + city', async () => {
      const dto = { nameEn: 'WH', nameAr: 'مستودع', address: 'King St', city: 'Riyadh' };

      await service.create(tenantId, dto as any, auditContext);

      expect(warehousesRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ location: 'King St, Riyadh' }),
      );
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return warehouse with locations', async () => {
      warehousesRepository.findById.mockResolvedValue({
        id: 'wh-1',
        nameEn: 'Main',
      });
      stockLocationsRepository.findAllPaginated.mockResolvedValue({
        rows: [
          { id: 'loc-1', nameEn: 'Internal' },
          { id: 'loc-2', nameEn: 'Input' },
        ],
        total: 2,
      });

      const result = await service.findById(tenantId, 'wh-1');

      expect(result.locations).toHaveLength(2);
      expect(stockLocationsRepository.findAllPaginated).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ warehouseId: 'wh-1' }),
      );
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      warehousesRepository.findById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated warehouses', async () => {
      warehousesRepository.findAll.mockResolvedValue({
        rows: [{ id: 'wh-1' }],
        total: 1,
      });

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update warehouse fields', async () => {
      warehousesRepository.findById.mockResolvedValue({ id: 'wh-1', nameEn: 'Old' });

      await service.update(tenantId, 'wh-1', { nameEn: 'New' } as any, auditContext);

      expect(warehousesRepository.update).toHaveBeenCalledWith(
        tenantId,
        'wh-1',
        expect.arrayContaining(['"nameEn" = :nameEn']),
        expect.objectContaining({ nameEn: 'New' }),
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft-delete the warehouse', async () => {
      warehousesRepository.findById.mockResolvedValue({ id: 'wh-1' });

      await service.remove(tenantId, 'wh-1', auditContext);

      expect(warehousesRepository.softDelete).toHaveBeenCalledWith(tenantId, 'wh-1', 'user-001');
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      warehousesRepository.findById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'bad-id', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
