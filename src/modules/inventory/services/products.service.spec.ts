jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductType } from '@/common/enums/pos.enums';

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: Record<string, jest.Mock>;
  let stockLevelsRepository: Record<string, jest.Mock>;
  let productTaxesRepository: Record<string, jest.Mock>;
  let comboProductsRepository: Record<string, jest.Mock>;
  let supplierProductsRepository: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001', tenantId };

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    productsRepository = {
      findAll: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findById: jest.fn().mockResolvedValue(null),
      findByIdWithRelations: jest.fn().mockResolvedValue(null),
      findByIdIncludingDeleted: jest.fn().mockResolvedValue(null),
      findExistingBySku: jest.fn().mockResolvedValue([]),
      findExistingBySkus: jest.fn().mockResolvedValue([]),
      findExistingByIds: jest.fn().mockResolvedValue([]),
      findAllForBranch: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findForDropdown: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue('product-new'),
      update: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue(undefined),
      getTransaction: jest.fn().mockResolvedValue(mockTransaction),
      findNameById: jest.fn().mockResolvedValue({ nameEn: 'Widget' }),
    };

    stockLevelsRepository = {
      findAvailability: jest.fn().mockResolvedValue(null),
    };

    productTaxesRepository = {
      findByProductId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(undefined),
      softDeleteByProductId: jest.fn().mockResolvedValue(undefined),
    };

    comboProductsRepository = {
      create: jest.fn().mockResolvedValue(undefined),
      findByProductId: jest.fn().mockResolvedValue(null),
    };

    supplierProductsRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    };

    service = new ProductsService(
      productsRepository as any,
      stockLevelsRepository as any,
      productTaxesRepository as any,
      comboProductsRepository as any,
      supplierProductsRepository as any,
    );
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated products with meta', async () => {
      productsRepository.findAll.mockResolvedValue({
        rows: [{ id: 'p1' }, { id: 'p2' }],
        total: 50,
      });

      const result = await service.findAll(tenantId, {
        page: 2,
        limit: 10,
        sortOrder: 'ASC',
      } as any);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ page: 2, limit: 10, total: 50, totalPages: 5 });
      expect(productsRepository.findAll).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ limit: 10, offset: 10 }),
      );
    });

    it('should use default pagination when not specified', async () => {
      productsRepository.findAll.mockResolvedValue({ rows: [], total: 0 });

      await service.findAll(tenantId, {} as any);

      expect(productsRepository.findAll).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });

    it('should pass filter params (branchId, categoryId, brandId)', async () => {
      productsRepository.findAll.mockResolvedValue({ rows: [], total: 0 });

      await service.findAll(tenantId, {
        branchId: 'b1',
        categoryId: 'cat1',
        brandId: 'brand1',
        productType: ProductType.STORABLE,
      } as any);

      expect(productsRepository.findAll).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          branchId: 'b1',
          categoryId: 'cat1',
          brandId: 'brand1',
          productType: ProductType.STORABLE,
        }),
      );
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return product with taxes', async () => {
      const product = { id: 'p1', nameEn: 'Widget', nameAr: 'قطعة' } as any;
      productsRepository.findByIdWithRelations.mockResolvedValue(product);
      productTaxesRepository.findByProductId.mockResolvedValue([{ taxId: 'tax-1', scope: 'sale' }]);

      const result = await service.findById(tenantId, 'p1');

      expect(result.taxes).toHaveLength(1);
      expect(productTaxesRepository.findByProductId).toHaveBeenCalledWith(tenantId, 'p1');
    });

    it('should throw NotFoundException when product not found', async () => {
      productsRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const baseDto = {
      nameEn: 'Widget',
      nameAr: 'قطعة',
      sku: 'WDG-001',
      categoryId: 'cat-001',
      unitPrice: 100,
    };

    beforeEach(() => {
      // After create, findById is called
      productsRepository.findByIdWithRelations.mockResolvedValue({
        id: 'product-new',
        ...baseDto,
        taxes: [],
      });
    });

    it('should create product and commit transaction', async () => {
      const result = await service.create(tenantId, baseDto as any, auditContext);

      expect(productsRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          nameEn: 'Widget',
          nameAr: 'قطعة',
          sku: 'WDG-001',
        }),
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.id).toBe('product-new');
    });

    it('should throw ConflictException when SKU already exists', async () => {
      productsRepository.findExistingBySku.mockResolvedValue([{ id: 'existing' }]);

      await expect(service.create(tenantId, baseDto as any, auditContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should auto-create combo_products when productType is COMBO', async () => {
      const comboDto = { ...baseDto, productType: ProductType.COMBO };

      await service.create(tenantId, comboDto as any, auditContext);

      expect(comboProductsRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'product-new' }),
        mockTransaction,
      );
    });

    it('should NOT create combo_products for storable product', async () => {
      const storableDto = { ...baseDto, productType: ProductType.STORABLE };

      await service.create(tenantId, storableDto as any, auditContext);

      expect(comboProductsRepository.create).not.toHaveBeenCalled();
    });

    it('should create product_taxes when taxes[] provided', async () => {
      const dtoWithTaxes = {
        ...baseDto,
        taxes: [
          { taxId: 'tax-1', scope: 'sale' },
          { taxId: 'tax-2', scope: 'purchase' },
        ],
      };

      await service.create(tenantId, dtoWithTaxes as any, auditContext);

      expect(productTaxesRepository.create).toHaveBeenCalledTimes(2);
      expect(productTaxesRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'product-new', taxId: 'tax-1', scope: 'sale' }),
        mockTransaction,
      );
    });

    it('should NOT create product_taxes when no taxes provided', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(productTaxesRepository.create).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      productsRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(tenantId, baseDto as any, auditContext)).rejects.toThrow(
        'DB error',
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should apply default values for optional fields', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(productsRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productType: ProductType.STORABLE,
          invoicePolicy: 'ordered',
          canBeSold: true,
          canBePurchased: true,
          hasVariants: false,
          hasSerialTracking: false,
          hasLotTracking: false,
          hasExpiryDate: false,
          isActive: true,
          taxRate: 15,
          unitOfMeasure: 'pcs',
          reorderPoint: 0,
        }),
        mockTransaction,
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    const existingProduct = {
      id: 'p1',
      nameEn: 'Widget',
      nameAr: 'قطعة',
      version: 1,
      productType: ProductType.STORABLE,
    };

    beforeEach(() => {
      productsRepository.findById.mockResolvedValue(existingProduct);
      productsRepository.findByIdWithRelations.mockResolvedValue({
        ...existingProduct,
        taxes: [],
      });
    });

    it('should update product and commit', async () => {
      const dto = { nameEn: 'Widget Pro', version: 1 };

      await service.update(tenantId, 'p1', dto as any, auditContext);

      expect(productsRepository.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'nonexistent', { version: 1 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      const dto = { nameEn: 'Widget Pro', version: 0 };

      await expect(service.update(tenantId, 'p1', dto as any, auditContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should auto-create combo_products when type changed to COMBO', async () => {
      const dto = { productType: ProductType.COMBO, version: 1 };

      await service.update(tenantId, 'p1', dto as any, auditContext);

      expect(comboProductsRepository.findByProductId).toHaveBeenCalledWith(tenantId, 'p1');
      expect(comboProductsRepository.create).toHaveBeenCalled();
    });

    it('should NOT create combo_products if already exists', async () => {
      comboProductsRepository.findByProductId.mockResolvedValue({ id: 'combo-1' });
      const dto = { productType: ProductType.COMBO, version: 1 };

      await service.update(tenantId, 'p1', dto as any, auditContext);

      expect(comboProductsRepository.create).not.toHaveBeenCalled();
    });

    it('should sync product taxes when taxes provided', async () => {
      const dto = {
        taxes: [{ taxId: 'tax-new', scope: 'sale' }],
        version: 1,
      };

      await service.update(tenantId, 'p1', dto as any, auditContext);

      expect(productTaxesRepository.softDeleteByProductId).toHaveBeenCalledWith(
        tenantId,
        'p1',
        auditContext.userId,
        mockTransaction,
      );
      expect(productTaxesRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'p1', taxId: 'tax-new' }),
        mockTransaction,
      );
    });

    it('should rollback on error during update', async () => {
      productsRepository.update.mockRejectedValue(new Error('update failed'));
      const dto = { nameEn: 'New', version: 1 };

      await expect(service.update(tenantId, 'p1', dto as any, auditContext)).rejects.toThrow();
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft-delete the product', async () => {
      productsRepository.findById.mockResolvedValue({ id: 'p1' });

      await service.remove(tenantId, 'p1', auditContext);

      expect(productsRepository.softDelete).toHaveBeenCalledWith(tenantId, 'p1', 'user-001');
    });

    it('should throw NotFoundException when product not found', async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── restore ────────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('should restore a soft-deleted product', async () => {
      productsRepository.findByIdIncludingDeleted.mockResolvedValue({
        id: 'p1',
        deletedAt: new Date(),
      });
      productsRepository.findByIdWithRelations.mockResolvedValue({ id: 'p1', taxes: [] });

      await service.restore(tenantId, 'p1', auditContext);

      expect(productsRepository.restore).toHaveBeenCalledWith(tenantId, 'p1', 'user-001');
    });

    it('should throw BadRequestException if product is not deleted', async () => {
      productsRepository.findByIdIncludingDeleted.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });

      await expect(service.restore(tenantId, 'p1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── getProductsForBranch ──────────────────────────────────────────────────

  describe('getProductsForBranch()', () => {
    it('should return products filtered by branch', async () => {
      productsRepository.findAllForBranch.mockResolvedValue({
        rows: [{ id: 'p1' }],
        total: 1,
      });

      const result = await service.getProductsForBranch(tenantId, 'branch-001', {
        page: 1,
        limit: 20,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(productsRepository.findAllForBranch).toHaveBeenCalledWith(
        tenantId,
        'branch-001',
        expect.any(Object),
      );
    });

    it('should pass filter params to branch query', async () => {
      productsRepository.findAllForBranch.mockResolvedValue({ rows: [], total: 0 });

      await service.getProductsForBranch(tenantId, 'branch-001', {
        productType: ProductType.SERVICE,
        categoryId: 'cat-1',
        canBeSold: true,
      } as any);

      expect(productsRepository.findAllForBranch).toHaveBeenCalledWith(
        tenantId,
        'branch-001',
        expect.objectContaining({
          productType: ProductType.SERVICE,
          categoryId: 'cat-1',
          canBeSold: true,
        }),
      );
    });
  });

  // ── updateCostPrice ──────────────────────────────────────────────────────

  describe('updateCostPrice()', () => {
    it('should calculate AVCO correctly', async () => {
      productsRepository.findById.mockResolvedValue({ id: 'p1', costPrice: '10' });
      stockLevelsRepository.findAvailability.mockResolvedValue({ quantity: '20' });

      await service.updateCostPrice(tenantId, 'p1', 10, 15);

      // AVCO: (20*10 + 10*15) / 30 = 350/30 = 11.67
      expect(productsRepository.update).toHaveBeenCalledWith(
        tenantId,
        'p1',
        expect.arrayContaining(['"costPrice" = :costPrice']),
        expect.objectContaining({ costPrice: 11.67 }),
        undefined,
      );
    });

    it('should skip update when totalQty is zero', async () => {
      productsRepository.findById.mockResolvedValue({ id: 'p1', costPrice: '0' });
      stockLevelsRepository.findAvailability.mockResolvedValue({ quantity: '0' });

      await service.updateCostPrice(tenantId, 'p1', 0, 15);

      expect(productsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing product', async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.updateCostPrice(tenantId, 'bad', 10, 15)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── bulkCreate ────────────────────────────────────────────────────────────

  describe('bulkCreate()', () => {
    it('should create multiple products in one transaction', async () => {
      productsRepository.create.mockResolvedValueOnce('p1').mockResolvedValueOnce('p2');

      const dto = {
        items: [
          { nameEn: 'A', nameAr: 'أ', sku: 'SKU-1', categoryId: 'c1', unitPrice: 10 },
          { nameEn: 'B', nameAr: 'ب', sku: 'SKU-2', categoryId: 'c1', unitPrice: 20 },
        ],
      };

      const result = await service.bulkCreate(tenantId, dto as any, auditContext);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw on duplicate SKUs within batch', async () => {
      const dto = {
        items: [
          { nameEn: 'A', nameAr: 'أ', sku: 'DUP', categoryId: 'c1', unitPrice: 10 },
          { nameEn: 'B', nameAr: 'ب', sku: 'DUP', categoryId: 'c1', unitPrice: 20 },
        ],
      };

      await expect(service.bulkCreate(tenantId, dto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when SKUs already exist in DB', async () => {
      productsRepository.findExistingBySkus.mockResolvedValue(['SKU-1']);

      const dto = {
        items: [{ nameEn: 'A', nameAr: 'أ', sku: 'SKU-1', categoryId: 'c1', unitPrice: 10 }],
      };

      await expect(service.bulkCreate(tenantId, dto as any, auditContext)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
