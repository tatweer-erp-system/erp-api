// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/pricelists.repository', () => ({
  PricelistsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/pricelist-items.repository', () => ({
  PricelistItemsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/products.repository', () => ({
  ProductsRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PricelistsService } from './pricelists.service';
import { PricelistsRepository } from '@/database/sql/repositories/pricelists.repository';
import { PricelistItemsRepository } from '@/database/sql/repositories/pricelist-items.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { PricelistApplyOn, PricelistComputation } from '@/common/enums/pricelist.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

describe('PricelistsService', () => {
  let service: PricelistsService;

  const mockPricelistsRepo = {
    findAllPaginated: jest.fn(),
    findOneById: jest.fn(),
    insertPricelist: jest.fn(),
    updatePricelist: jest.fn(),
    softDeletePricelist: jest.fn(),
  };

  const mockItemsRepo = {
    findByPricelistId: jest.fn(),
    findOneById: jest.fn(),
    insertItem: jest.fn(),
    updateItem: jest.fn(),
    softDeleteItem: jest.fn(),
    findMatchingItems: jest.fn(),
  };

  const mockProductsRepo = {
    findById: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricelistsService,
        { provide: PricelistsRepository, useValue: mockPricelistsRepo },
        { provide: PricelistItemsRepository, useValue: mockItemsRepo },
        { provide: ProductsRepository, useValue: mockProductsRepo },
        { provide: AuditSharedService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PricelistsService>(PricelistsService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated pricelists with defaults', async () => {
      mockPricelistsRepo.findAllPaginated.mockResolvedValue({
        rows: [{ id: 'pl-1', nameEn: 'Summer Sale' }],
        total: 1,
      });

      const result = await service.findAll(tenantId, new PaginationDto());

      expect(mockPricelistsRepo.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 20,
        offset: 0,
        search: undefined,
        sortOrder: 'DESC',
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should apply custom page, limit, and sortOrder', async () => {
      mockPricelistsRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      const pagination = Object.assign(new PaginationDto(), {
        page: 2,
        limit: 5,
        sortOrder: 'DESC' as const,
      });
      await service.findAll(tenantId, pagination);

      expect(mockPricelistsRepo.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 5,
        offset: 5,
        search: undefined,
        sortOrder: 'DESC',
      });
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return pricelist when found', async () => {
      const pricelist = { id: 'pl-1', nameEn: 'Summer' };
      mockPricelistsRepo.findOneById.mockResolvedValue(pricelist);

      const result = await service.findById(tenantId, 'pl-1');

      expect(result).toEqual(pricelist);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create pricelist and log audit', async () => {
      mockPricelistsRepo.insertPricelist.mockResolvedValue('pl-new');
      const created = { id: 'pl-new', nameEn: 'Ramadan' };
      mockPricelistsRepo.findOneById.mockResolvedValue(created);

      const result = await service.create(
        tenantId,
        {
          nameEn: 'Ramadan',
          nameAr: 'رمضان',
          discountPolicy: 'include_in_price',
          isActive: true,
        } as any,
        auditContext,
      );

      expect(mockPricelistsRepo.insertPricelist).toHaveBeenCalledWith(tenantId, {
        nameEn: 'Ramadan',
        nameAr: 'رمضان',
        currencyId: null,
        discountPolicy: 'include_in_price',
        startDate: null,
        endDate: null,
        isActive: true,
        createdBy: 'user-001',
      });
      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'sales.pricelists',
        'pl-new',
        created,
        'user-001',
      );
      expect(result.id).toBe('pl-new');
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update pricelist fields and log audit', async () => {
      const existing = { id: 'pl-1', nameEn: 'Old' };
      const updated = { id: 'pl-1', nameEn: 'New' };
      mockPricelistsRepo.findOneById
        .mockResolvedValueOnce(existing) // findById
        .mockResolvedValueOnce(updated); // after update

      await service.update(tenantId, 'pl-1', { nameEn: 'New' } as any, auditContext);

      expect(mockPricelistsRepo.updatePricelist).toHaveBeenCalledWith(
        tenantId,
        'pl-1',
        expect.arrayContaining(['"nameEn" = :nameEn', '"updatedBy" = :updatedBy']),
        expect.objectContaining({ nameEn: 'New', updatedBy: 'user-001' }),
      );
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
    });

    it('should throw NotFoundException when pricelist not found', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue(null);

      await expect(service.update(tenantId, 'missing', {} as any, auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete and log audit', async () => {
      const existing = { id: 'pl-1' };
      mockPricelistsRepo.findOneById.mockResolvedValue(existing);

      await service.remove(tenantId, 'pl-1', auditContext);

      expect(mockPricelistsRepo.softDeletePricelist).toHaveBeenCalledWith(
        tenantId,
        'pl-1',
        'user-001',
      );
      expect(mockAuditService.logDelete).toHaveBeenCalled();
    });
  });

  // ── getItems ───────────────────────────────────────────────────────────────

  describe('getItems', () => {
    it('should return items for a pricelist', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue({ id: 'pl-1' });
      mockItemsRepo.findByPricelistId.mockResolvedValue([{ id: 'item-1' }, { id: 'item-2' }]);

      const result = await service.getItems(tenantId, 'pl-1');

      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException when pricelist not found', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue(null);

      await expect(service.getItems(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── createItem ─────────────────────────────────────────────────────────────

  describe('createItem', () => {
    it('should create item with fixed price computation', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue({ id: 'pl-1' });
      mockItemsRepo.insertItem.mockResolvedValue('item-new');
      mockItemsRepo.findOneById.mockResolvedValue({ id: 'item-new' });

      await service.createItem(
        tenantId,
        'pl-1',
        {
          applyOn: PricelistApplyOn.ALL,
          computation: PricelistComputation.FIXED,
          price: 99.99,
          minQty: 1,
          sequence: 10,
        } as any,
        auditContext,
      );

      expect(mockItemsRepo.insertItem).toHaveBeenCalledWith(tenantId, {
        pricelistId: 'pl-1',
        applyOn: PricelistApplyOn.ALL,
        productId: null,
        categoryId: null,
        minQty: 1,
        computation: PricelistComputation.FIXED,
        price: 99.99,
        discountPct: null,
        startDate: null,
        endDate: null,
        sequence: 10,
        createdBy: 'user-001',
      });
    });

    it('should require productId when applyOn is PRODUCT', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue({ id: 'pl-1' });

      await expect(
        service.createItem(
          tenantId,
          'pl-1',
          { applyOn: PricelistApplyOn.PRODUCT, computation: PricelistComputation.FIXED } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require categoryId when applyOn is CATEGORY', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue({ id: 'pl-1' });

      await expect(
        service.createItem(
          tenantId,
          'pl-1',
          { applyOn: PricelistApplyOn.CATEGORY, computation: PricelistComputation.FIXED } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept productId when applyOn is PRODUCT', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue({ id: 'pl-1' });
      mockItemsRepo.insertItem.mockResolvedValue('item-x');
      mockItemsRepo.findOneById.mockResolvedValue({ id: 'item-x' });

      await service.createItem(
        tenantId,
        'pl-1',
        {
          applyOn: PricelistApplyOn.PRODUCT,
          productId: 'prod-1',
          computation: PricelistComputation.PERCENTAGE,
          discountPct: 15,
          minQty: 1,
          sequence: 1,
        } as any,
        auditContext,
      );

      expect(mockItemsRepo.insertItem).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'prod-1' }),
      );
    });
  });

  // ── updateItem ─────────────────────────────────────────────────────────────

  describe('updateItem', () => {
    it('should update item fields', async () => {
      mockItemsRepo.findOneById
        .mockResolvedValueOnce({ id: 'item-1' })
        .mockResolvedValueOnce({ id: 'item-1', price: 50 });
      mockItemsRepo.updateItem.mockResolvedValue(undefined);

      await service.updateItem(tenantId, 'item-1', { price: 50 } as any, auditContext);

      expect(mockItemsRepo.updateItem).toHaveBeenCalledWith(
        tenantId,
        'item-1',
        expect.arrayContaining(['price = :price']),
        expect.objectContaining({ price: 50 }),
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      mockItemsRepo.findOneById.mockResolvedValue(null);

      await expect(
        service.updateItem(tenantId, 'missing', {} as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeItem ─────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('should soft-delete item', async () => {
      mockItemsRepo.findOneById.mockResolvedValue({ id: 'item-1' });

      await service.removeItem(tenantId, 'item-1', auditContext);

      expect(mockItemsRepo.softDeleteItem).toHaveBeenCalledWith(tenantId, 'item-1', 'user-001');
    });

    it('should throw NotFoundException when item not found', async () => {
      mockItemsRepo.findOneById.mockResolvedValue(null);

      await expect(service.removeItem(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── computePrice ───────────────────────────────────────────────────────────

  describe('computePrice', () => {
    const product = {
      id: 'prod-1',
      salePrice: '100',
      price: '100',
      categoryId: 'cat-1',
    };

    beforeEach(() => {
      mockPricelistsRepo.findOneById.mockResolvedValue({ id: 'pl-1' });
      mockProductsRepo.findById.mockResolvedValue(product);
    });

    it('should return original price when no matching item found', async () => {
      mockItemsRepo.findMatchingItems.mockResolvedValue(null);

      const result = await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-1',
        qty: 1,
      });

      expect(result).toEqual({
        originalPrice: 100,
        computedPrice: 100,
        discount: 0,
        pricelistItemId: null,
      });
    });

    it('should compute fixed price correctly', async () => {
      mockItemsRepo.findMatchingItems.mockResolvedValue({
        id: 'item-1',
        computation: PricelistComputation.FIXED,
        price: '75',
        discountPct: null,
      });

      const result = await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-1',
        qty: 1,
      });

      expect(result.computedPrice).toBe(75);
      expect(result.discount).toBe(25);
      expect(result.pricelistItemId).toBe('item-1');
    });

    it('should compute percentage discount correctly', async () => {
      mockItemsRepo.findMatchingItems.mockResolvedValue({
        id: 'item-2',
        computation: PricelistComputation.PERCENTAGE,
        price: null,
        discountPct: '20',
      });

      const result = await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-1',
        qty: 1,
      });

      // discount = Math.round(100 * 20) / 100 = 20
      // computedPrice = 100 - 20 = 80
      expect(result.discount).toBe(20);
      expect(result.computedPrice).toBe(80);
    });

    it('should compute formula: percentage discount + surcharge', async () => {
      mockItemsRepo.findMatchingItems.mockResolvedValue({
        id: 'item-3',
        computation: PricelistComputation.FORMULA,
        price: '5', // surcharge
        discountPct: '10', // 10% discount
      });

      const result = await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-1',
        qty: 1,
      });

      // discount = Math.round(100 * 10) / 100 = 10
      // computedPrice = 100 - 10 + 5 = 95
      expect(result.discount).toBe(10);
      expect(result.computedPrice).toBe(95);
    });

    it('should never return negative computed price', async () => {
      mockItemsRepo.findMatchingItems.mockResolvedValue({
        id: 'item-4',
        computation: PricelistComputation.FIXED,
        price: '-10',
        discountPct: null,
      });

      const result = await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-1',
        qty: 1,
      });

      expect(result.computedPrice).toBe(0);
    });

    it('should default qty to 1 when not provided', async () => {
      mockItemsRepo.findMatchingItems.mockResolvedValue(null);

      await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-1',
      } as any);

      expect(mockItemsRepo.findMatchingItems).toHaveBeenCalledWith(
        tenantId,
        'pl-1',
        'prod-1',
        'cat-1',
        1,
        expect.any(String),
      );
    });

    it('should use price when salePrice is null', async () => {
      mockProductsRepo.findById.mockResolvedValue({
        id: 'prod-2',
        salePrice: null,
        price: '50',
        categoryId: null,
      });
      mockItemsRepo.findMatchingItems.mockResolvedValue(null);

      const result = await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-2',
        qty: 1,
      });

      expect(result.originalPrice).toBe(50);
    });

    it('should handle product with categoryId null', async () => {
      mockProductsRepo.findById.mockResolvedValue({
        id: 'prod-3',
        salePrice: '200',
        price: '200',
        categoryId: null,
      });
      mockItemsRepo.findMatchingItems.mockResolvedValue(null);

      await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-3',
        qty: 1,
      });

      expect(mockItemsRepo.findMatchingItems).toHaveBeenCalledWith(
        tenantId,
        'pl-1',
        'prod-3',
        null,
        1,
        expect.any(String),
      );
    });

    it('should throw NotFoundException when pricelist not found', async () => {
      mockPricelistsRepo.findOneById.mockResolvedValue(null);

      await expect(
        service.computePrice(tenantId, {
          pricelistId: 'missing',
          productId: 'prod-1',
          qty: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockProductsRepo.findById.mockResolvedValue(null);

      await expect(
        service.computePrice(tenantId, {
          pricelistId: 'pl-1',
          productId: 'missing',
          qty: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should round computedPrice to 2 decimal places', async () => {
      mockProductsRepo.findById.mockResolvedValue({
        id: 'prod-x',
        salePrice: '99.99',
        categoryId: null,
      });
      mockItemsRepo.findMatchingItems.mockResolvedValue({
        id: 'item-x',
        computation: PricelistComputation.PERCENTAGE,
        discountPct: '33',
      });

      const result = await service.computePrice(tenantId, {
        pricelistId: 'pl-1',
        productId: 'prod-x',
        qty: 1,
      });

      // discount = Math.round(99.99 * 33) / 100 = Math.round(3299.67) / 100 = 32.9967 -> 33
      // computedPrice = 99.99 - 33 = 66.99
      expect(result.computedPrice).toBe(Number(result.computedPrice.toFixed(2)));
    });
  });
});
