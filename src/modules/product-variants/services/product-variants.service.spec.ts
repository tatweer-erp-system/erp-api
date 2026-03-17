// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/product-variants.repository', () => ({
  ProductVariantsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/product-variant-attribute-values.repository', () => ({
  ProductVariantAttributeValuesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/product-template-attributes.repository', () => ({
  ProductTemplateAttributesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/product-template-attribute-values.repository', () => ({
  ProductTemplateAttributeValuesRepository: jest.fn(),
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
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariantsRepository } from '@/database/sql/repositories/product-variants.repository';
import { ProductVariantAttributeValuesRepository } from '@/database/sql/repositories/product-variant-attribute-values.repository';
import { ProductTemplateAttributesRepository } from '@/database/sql/repositories/product-template-attributes.repository';
import { ProductTemplateAttributeValuesRepository } from '@/database/sql/repositories/product-template-attribute-values.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockVariantsRepo = {
    findByProductId: jest.fn(),
    findById: jest.fn(),
    findByIdWithAttributes: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getTransaction: jest.fn(() => mockTransaction),
    softDeleteByProductId: jest.fn(),
  };

  const mockVariantAttrValuesRepo = {
    create: jest.fn(),
  };

  const mockTemplateAttrsRepo = {
    findByProductId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    existsByProductAndAttribute: jest.fn(),
  };

  const mockTemplateAttrValuesRepo = {
    findByTemplateAttributeId: jest.fn(),
    create: jest.fn(),
    findActiveByProductId: jest.fn(),
  };

  const mockProductsRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantsService,
        { provide: ProductVariantsRepository, useValue: mockVariantsRepo },
        {
          provide: ProductVariantAttributeValuesRepository,
          useValue: mockVariantAttrValuesRepo,
        },
        { provide: ProductTemplateAttributesRepository, useValue: mockTemplateAttrsRepo },
        {
          provide: ProductTemplateAttributeValuesRepository,
          useValue: mockTemplateAttrValuesRepo,
        },
        { provide: ProductsRepository, useValue: mockProductsRepo },
      ],
    }).compile();

    service = module.get<ProductVariantsService>(ProductVariantsService);
  });

  // ── getTemplateAttributes ──────────────────────────────────────────────────

  describe('getTemplateAttributes', () => {
    it('should return template attributes with their values', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1' });
      const ta = [{ id: 'ta-1', attributeId: 'attr-color' }];
      mockTemplateAttrsRepo.findByProductId.mockResolvedValue(ta);
      mockTemplateAttrValuesRepo.findByTemplateAttributeId.mockResolvedValue([
        { id: 'tav-1', valueNameEn: 'Red' },
      ]);

      const result = await service.getTemplateAttributes(tenantId, 'prod-1');

      expect(result).toHaveLength(1);
      expect(result[0].values).toHaveLength(1);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockProductsRepo.findById.mockResolvedValue(null);

      await expect(service.getTemplateAttributes(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── addTemplateAttribute ───────────────────────────────────────────────────

  describe('addTemplateAttribute', () => {
    it('should add template attribute with values and mark product hasVariants', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: false });
      mockTemplateAttrsRepo.existsByProductAndAttribute.mockResolvedValue(false);
      mockTemplateAttrsRepo.create.mockResolvedValue('ta-new');
      mockTemplateAttrValuesRepo.create.mockResolvedValue('tav-new');
      mockProductsRepo.update.mockResolvedValue(undefined);

      // For the final getTemplateAttributes call
      mockTemplateAttrsRepo.findByProductId.mockResolvedValue([{ id: 'ta-new' }]);
      mockTemplateAttrValuesRepo.findByTemplateAttributeId.mockResolvedValue([]);

      const dto = {
        attributeId: 'attr-color',
        values: [{ attributeValueId: 'val-red', priceExtra: 5 }, { attributeValueId: 'val-blue' }],
      };

      await service.addTemplateAttribute(tenantId, 'prod-1', dto as any, auditContext);

      expect(mockTemplateAttrsRepo.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'prod-1', attributeId: 'attr-color' }),
        mockTransaction,
      );
      expect(mockTemplateAttrValuesRepo.create).toHaveBeenCalledTimes(2);
      expect(mockProductsRepo.update).toHaveBeenCalledWith(
        tenantId,
        'prod-1',
        expect.arrayContaining(['"hasVariants" = true']),
        expect.any(Object),
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should not update hasVariants if product already has variants', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: true });
      mockTemplateAttrsRepo.existsByProductAndAttribute.mockResolvedValue(false);
      mockTemplateAttrsRepo.create.mockResolvedValue('ta-new');
      mockTemplateAttrsRepo.findByProductId.mockResolvedValue([]);
      mockTemplateAttrValuesRepo.findByTemplateAttributeId.mockResolvedValue([]);

      await service.addTemplateAttribute(
        tenantId,
        'prod-1',
        { attributeId: 'attr-1', values: [] } as any,
        auditContext,
      );

      expect(mockProductsRepo.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if attribute already assigned', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1' });
      mockTemplateAttrsRepo.existsByProductAndAttribute.mockResolvedValue(true);

      await expect(
        service.addTemplateAttribute(
          tenantId,
          'prod-1',
          { attributeId: 'attr-1', values: [] } as any,
          auditContext,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should rollback transaction on error', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: false });
      mockTemplateAttrsRepo.existsByProductAndAttribute.mockResolvedValue(false);
      mockTemplateAttrsRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.addTemplateAttribute(
          tenantId,
          'prod-1',
          { attributeId: 'attr-1', values: [] } as any,
          auditContext,
        ),
      ).rejects.toThrow('DB error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  // ── removeTemplateAttribute ────────────────────────────────────────────────

  describe('removeTemplateAttribute', () => {
    it('should soft-delete existing template attribute', async () => {
      mockTemplateAttrsRepo.findById.mockResolvedValue({ id: 'ta-1' });

      await service.removeTemplateAttribute(tenantId, 'ta-1', auditContext);

      expect(mockTemplateAttrsRepo.softDelete).toHaveBeenCalledWith(tenantId, 'ta-1', 'user-001');
    });

    it('should throw NotFoundException when template attribute not found', async () => {
      mockTemplateAttrsRepo.findById.mockResolvedValue(null);

      await expect(
        service.removeTemplateAttribute(tenantId, 'missing', auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findVariantsByProduct ──────────────────────────────────────────────────

  describe('findVariantsByProduct', () => {
    it('should return paginated variants', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1' });
      mockVariantsRepo.findByProductId.mockResolvedValue({
        rows: [
          { id: 'v-1', combinationName: 'Red / S' },
          { id: 'v-2', combinationName: 'Red / L' },
        ],
        total: 2,
      });

      const result = await service.findVariantsByProduct(tenantId, 'prod-1', new PaginationDto());

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it('should throw NotFoundException when product not found', async () => {
      mockProductsRepo.findById.mockResolvedValue(null);

      await expect(
        service.findVariantsByProduct(tenantId, 'missing', new PaginationDto()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findVariantById ────────────────────────────────────────────────────────

  describe('findVariantById', () => {
    it('should return variant with attributes', async () => {
      const variant = { id: 'v-1', combinationName: 'Red / S', attributes: [] };
      mockVariantsRepo.findByIdWithAttributes.mockResolvedValue(variant);

      const result = await service.findVariantById(tenantId, 'v-1');

      expect(result).toEqual(variant);
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockVariantsRepo.findByIdWithAttributes.mockResolvedValue(null);

      await expect(service.findVariantById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateVariant ──────────────────────────────────────────────────────────

  describe('updateVariant', () => {
    const existing = { id: 'v-1', version: 1 };

    it('should update barcode and priceExtra on version match', async () => {
      mockVariantsRepo.findById.mockResolvedValue(existing);
      mockVariantsRepo.update.mockResolvedValue(undefined);
      mockVariantsRepo.findByIdWithAttributes.mockResolvedValue({
        ...existing,
        barcode: '123',
        priceExtra: 10,
      });

      const result = await service.updateVariant(
        tenantId,
        'v-1',
        { version: 1, barcode: '123', priceExtra: 10 } as any,
        auditContext,
      );

      expect(mockVariantsRepo.update).toHaveBeenCalledWith(
        tenantId,
        'v-1',
        expect.arrayContaining(['barcode = :barcode', '"priceExtra" = :priceExtra']),
        expect.objectContaining({ barcode: '123', priceExtra: 10 }),
      );
      expect(result.barcode).toBe('123');
    });

    it('should update costPrice and isActive', async () => {
      mockVariantsRepo.findById.mockResolvedValue(existing);
      mockVariantsRepo.update.mockResolvedValue(undefined);
      mockVariantsRepo.findByIdWithAttributes.mockResolvedValue({
        ...existing,
        costPrice: 25,
        isActive: false,
      });

      await service.updateVariant(
        tenantId,
        'v-1',
        { version: 1, costPrice: 25, isActive: false } as any,
        auditContext,
      );

      expect(mockVariantsRepo.update).toHaveBeenCalledWith(
        tenantId,
        'v-1',
        expect.arrayContaining(['"costPrice" = :costPrice', '"isActive" = :isActive']),
        expect.objectContaining({ costPrice: 25, isActive: false }),
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      mockVariantsRepo.findById.mockResolvedValue(existing);

      await expect(
        service.updateVariant(tenantId, 'v-1', { version: 0 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockVariantsRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateVariant(tenantId, 'missing', { version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── generateVariants ───────────────────────────────────────────────────────

  describe('generateVariants', () => {
    it('should generate 4 variants from Color(Red,Blue) x Size(S,L)', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: false });

      const allValues = [
        {
          attributeId: 'attr-color',
          attributeValueId: 'val-red',
          valueNameEn: 'Red',
          valueNameAr: 'احمر',
          priceExtra: '5',
        },
        {
          attributeId: 'attr-color',
          attributeValueId: 'val-blue',
          valueNameEn: 'Blue',
          valueNameAr: 'ازرق',
          priceExtra: '0',
        },
        {
          attributeId: 'attr-size',
          attributeValueId: 'val-s',
          valueNameEn: 'S',
          valueNameAr: 'صغير',
          priceExtra: '0',
        },
        {
          attributeId: 'attr-size',
          attributeValueId: 'val-l',
          valueNameEn: 'L',
          valueNameAr: 'كبير',
          priceExtra: '10',
        },
      ];
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue(allValues);

      let variantCounter = 0;
      mockVariantsRepo.create.mockImplementation(() => {
        variantCounter++;
        return Promise.resolve(`variant-${variantCounter}`);
      });
      mockVariantsRepo.softDeleteByProductId.mockResolvedValue(undefined);
      mockProductsRepo.update.mockResolvedValue(undefined);
      mockVariantAttrValuesRepo.create.mockResolvedValue('vav-id');

      const result = await service.generateVariants(tenantId, 'prod-1', auditContext);

      expect(result.generatedCount).toBe(4);
      expect(result.variants).toHaveLength(4);

      // Verify exact combinations: Red/S, Red/L, Blue/S, Blue/L
      const names = result.variants.map((v: any) => v.combinationName);
      expect(names).toContain('Red / S | احمر / صغير');
      expect(names).toContain('Red / L | احمر / كبير');
      expect(names).toContain('Blue / S | ازرق / صغير');
      expect(names).toContain('Blue / L | ازرق / كبير');

      // Verify priceExtra sums
      const redL = result.variants.find((v: any) => v.combinationName === 'Red / L | احمر / كبير');
      expect(redL.priceExtra).toBe(15); // 5 (Red) + 10 (L)

      const blueS = result.variants.find(
        (v: any) => v.combinationName === 'Blue / S | ازرق / صغير',
      );
      expect(blueS.priceExtra).toBe(0); // 0 (Blue) + 0 (S)

      const redS = result.variants.find((v: any) => v.combinationName === 'Red / S | احمر / صغير');
      expect(redS.priceExtra).toBe(5); // 5 (Red) + 0 (S)

      const blueL = result.variants.find(
        (v: any) => v.combinationName === 'Blue / L | ازرق / كبير',
      );
      expect(blueL.priceExtra).toBe(10); // 0 (Blue) + 10 (L)
    });

    it('should generate 6 variants from Color(R,G,B) x Size(S,L)', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: true });

      const allValues = [
        {
          attributeId: 'color',
          attributeValueId: 'r',
          valueNameEn: 'R',
          valueNameAr: 'ر',
          priceExtra: '0',
        },
        {
          attributeId: 'color',
          attributeValueId: 'g',
          valueNameEn: 'G',
          valueNameAr: 'خ',
          priceExtra: '0',
        },
        {
          attributeId: 'color',
          attributeValueId: 'b',
          valueNameEn: 'B',
          valueNameAr: 'ز',
          priceExtra: '0',
        },
        {
          attributeId: 'size',
          attributeValueId: 's',
          valueNameEn: 'S',
          valueNameAr: 'ص',
          priceExtra: '0',
        },
        {
          attributeId: 'size',
          attributeValueId: 'l',
          valueNameEn: 'L',
          valueNameAr: 'ك',
          priceExtra: '0',
        },
      ];
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue(allValues);

      let counter = 0;
      mockVariantsRepo.create.mockImplementation(() => Promise.resolve(`v-${++counter}`));
      mockVariantsRepo.softDeleteByProductId.mockResolvedValue(undefined);
      mockVariantAttrValuesRepo.create.mockResolvedValue('id');

      const result = await service.generateVariants(tenantId, 'prod-1', auditContext);

      expect(result.generatedCount).toBe(6);
      // hasVariants already true so products.update should NOT be called
      expect(mockProductsRepo.update).not.toHaveBeenCalled();
    });

    it('should generate 8 variants from 3 attributes (2x2x2)', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: false });

      const allValues = [
        {
          attributeId: 'color',
          attributeValueId: 'r',
          valueNameEn: 'R',
          valueNameAr: 'ر',
          priceExtra: '2',
        },
        {
          attributeId: 'color',
          attributeValueId: 'b',
          valueNameEn: 'B',
          valueNameAr: 'ز',
          priceExtra: '0',
        },
        {
          attributeId: 'size',
          attributeValueId: 's',
          valueNameEn: 'S',
          valueNameAr: 'ص',
          priceExtra: '1',
        },
        {
          attributeId: 'size',
          attributeValueId: 'l',
          valueNameEn: 'L',
          valueNameAr: 'ك',
          priceExtra: '3',
        },
        {
          attributeId: 'material',
          attributeValueId: 'ct',
          valueNameEn: 'Cotton',
          valueNameAr: 'قطن',
          priceExtra: '0',
        },
        {
          attributeId: 'material',
          attributeValueId: 'pl',
          valueNameEn: 'Poly',
          valueNameAr: 'بولي',
          priceExtra: '5',
        },
      ];
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue(allValues);

      let counter = 0;
      mockVariantsRepo.create.mockImplementation(() => Promise.resolve(`v-${++counter}`));
      mockVariantsRepo.softDeleteByProductId.mockResolvedValue(undefined);
      mockProductsRepo.update.mockResolvedValue(undefined);
      mockVariantAttrValuesRepo.create.mockResolvedValue('id');

      const result = await service.generateVariants(tenantId, 'prod-1', auditContext);

      expect(result.generatedCount).toBe(8); // 2 x 2 x 2

      // Verify a specific combination's priceExtra: R/L/Poly = 2 + 3 + 5 = 10
      const rLPoly = result.variants.find(
        (v: any) => v.combinationName === 'R / L / Poly | ر / ك / بولي',
      );
      expect(rLPoly).toBeDefined();
      expect(rLPoly.priceExtra).toBe(10);
    });

    it('should soft-delete old variants before generating new ones', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: true });
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue([
        {
          attributeId: 'c',
          attributeValueId: 'r',
          valueNameEn: 'R',
          valueNameAr: 'ر',
          priceExtra: '0',
        },
      ]);

      mockVariantsRepo.create.mockResolvedValue('v-1');
      mockVariantsRepo.softDeleteByProductId.mockResolvedValue(undefined);
      mockVariantAttrValuesRepo.create.mockResolvedValue('id');

      await service.generateVariants(tenantId, 'prod-1', auditContext);

      expect(mockVariantsRepo.softDeleteByProductId).toHaveBeenCalledWith(
        tenantId,
        'prod-1',
        'user-001',
        mockTransaction,
      );
    });

    it('should create variant-attribute-value links for each combination value', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: true });
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue([
        {
          attributeId: 'c',
          attributeValueId: 'val-r',
          valueNameEn: 'R',
          valueNameAr: 'ر',
          priceExtra: '0',
        },
        {
          attributeId: 's',
          attributeValueId: 'val-s',
          valueNameEn: 'S',
          valueNameAr: 'ص',
          priceExtra: '0',
        },
      ]);

      mockVariantsRepo.create.mockResolvedValue('v-1');
      mockVariantsRepo.softDeleteByProductId.mockResolvedValue(undefined);
      mockVariantAttrValuesRepo.create.mockResolvedValue('link-id');

      await service.generateVariants(tenantId, 'prod-1', auditContext);

      // 1 combination (R x S), each has 2 attribute values linked
      expect(mockVariantAttrValuesRepo.create).toHaveBeenCalledTimes(2);
      expect(mockVariantAttrValuesRepo.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ variantId: 'v-1', attributeValueId: 'val-r' }),
        mockTransaction,
      );
      expect(mockVariantAttrValuesRepo.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ variantId: 'v-1', attributeValueId: 'val-s' }),
        mockTransaction,
      );
    });

    it('should throw BadRequestException when no active attribute values', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1' });
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue([]);

      await expect(service.generateVariants(tenantId, 'prod-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      mockProductsRepo.findById.mockResolvedValue(null);

      await expect(service.generateVariants(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback transaction on error during generation', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: false });
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue([
        {
          attributeId: 'c',
          attributeValueId: 'r',
          valueNameEn: 'R',
          valueNameAr: 'ر',
          priceExtra: '0',
        },
      ]);
      mockVariantsRepo.softDeleteByProductId.mockResolvedValue(undefined);
      mockVariantsRepo.create.mockRejectedValue(new Error('DB failure'));

      await expect(service.generateVariants(tenantId, 'prod-1', auditContext)).rejects.toThrow(
        'DB failure',
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should commit transaction on success', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1', hasVariants: true });
      mockTemplateAttrValuesRepo.findActiveByProductId.mockResolvedValue([
        {
          attributeId: 'c',
          attributeValueId: 'r',
          valueNameEn: 'R',
          valueNameAr: 'ر',
          priceExtra: '0',
        },
      ]);
      mockVariantsRepo.softDeleteByProductId.mockResolvedValue(undefined);
      mockVariantsRepo.create.mockResolvedValue('v-1');
      mockVariantAttrValuesRepo.create.mockResolvedValue('id');

      await service.generateVariants(tenantId, 'prod-1', auditContext);

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });
  });
});
