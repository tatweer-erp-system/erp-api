// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/product-attributes.repository', () => ({
  ProductAttributesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/product-attribute-values.repository', () => ({
  ProductAttributeValuesRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductAttributesService } from './product-attributes.service';
import { ProductAttributesRepository } from '@/database/sql/repositories/product-attributes.repository';
import { ProductAttributeValuesRepository } from '@/database/sql/repositories/product-attribute-values.repository';
import { AttributeDisplayType } from '@/common/enums/product-variant.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

describe('ProductAttributesService', () => {
  let service: ProductAttributesService;

  const mockAttributesRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdWithValues: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findForDropdown: jest.fn(),
  };

  const mockValuesRepo = {
    findAllByAttribute: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductAttributesService,
        { provide: ProductAttributesRepository, useValue: mockAttributesRepo },
        { provide: ProductAttributeValuesRepository, useValue: mockValuesRepo },
      ],
    }).compile();

    service = module.get<ProductAttributesService>(ProductAttributesService);
  });

  // ── findAllAttributes ──────────────────────────────────────────────────────

  describe('findAllAttributes', () => {
    it('should return paginated attributes with defaults', async () => {
      mockAttributesRepo.findAll.mockResolvedValue({
        rows: [{ id: 'attr-1', nameEn: 'Color' }],
        total: 1,
      });

      const result = await service.findAllAttributes(tenantId, new PaginationDto());

      expect(mockAttributesRepo.findAll).toHaveBeenCalledWith(tenantId, {
        limit: 20,
        offset: 0,
        search: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should apply custom page and limit', async () => {
      mockAttributesRepo.findAll.mockResolvedValue({ rows: [], total: 50 });

      const pagination = Object.assign(new PaginationDto(), { page: 3, limit: 10 });
      const result = await service.findAllAttributes(tenantId, pagination);

      expect(mockAttributesRepo.findAll).toHaveBeenCalledWith(tenantId, {
        limit: 10,
        offset: 20,
        search: undefined,
      });
      expect(result.meta).toEqual({ page: 3, limit: 10, total: 50, totalPages: 5 });
    });
  });

  // ── findAttributeById ──────────────────────────────────────────────────────

  describe('findAttributeById', () => {
    it('should return attribute with values when found', async () => {
      const attr = { id: 'attr-1', nameEn: 'Color', values: [] };
      mockAttributesRepo.findByIdWithValues.mockResolvedValue(attr);

      const result = await service.findAttributeById(tenantId, 'attr-1');

      expect(result).toEqual(attr);
      expect(mockAttributesRepo.findByIdWithValues).toHaveBeenCalledWith(tenantId, 'attr-1');
    });

    it('should throw NotFoundException when attribute not found', async () => {
      mockAttributesRepo.findByIdWithValues.mockResolvedValue(null);

      await expect(service.findAttributeById(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── createAttribute ────────────────────────────────────────────────────────

  describe('createAttribute', () => {
    it('should create attribute with default displayType and sequence', async () => {
      mockAttributesRepo.create.mockResolvedValue('attr-new');
      mockAttributesRepo.findByIdWithValues.mockResolvedValue({
        id: 'attr-new',
        nameEn: 'Size',
        nameAr: 'الحجم',
        displayType: AttributeDisplayType.SELECT,
        sequence: 0,
      });

      const result = await service.createAttribute(
        tenantId,
        { nameEn: 'Size', nameAr: 'الحجم' } as any,
        auditContext,
      );

      expect(mockAttributesRepo.create).toHaveBeenCalledWith(tenantId, {
        nameEn: 'Size',
        nameAr: 'الحجم',
        displayType: AttributeDisplayType.SELECT,
        sequence: 0,
        createdBy: 'user-001',
      });
      expect(result.id).toBe('attr-new');
    });

    it('should create attribute with explicit displayType and sequence', async () => {
      mockAttributesRepo.create.mockResolvedValue('attr-color');
      mockAttributesRepo.findByIdWithValues.mockResolvedValue({
        id: 'attr-color',
        displayType: AttributeDisplayType.COLOR,
        sequence: 5,
      });

      await service.createAttribute(
        tenantId,
        {
          nameEn: 'Color',
          nameAr: 'اللون',
          displayType: AttributeDisplayType.COLOR,
          sequence: 5,
        } as any,
        auditContext,
      );

      expect(mockAttributesRepo.create).toHaveBeenCalledWith(tenantId, {
        nameEn: 'Color',
        nameAr: 'اللون',
        displayType: AttributeDisplayType.COLOR,
        sequence: 5,
        createdBy: 'user-001',
      });
    });
  });

  // ── updateAttribute ────────────────────────────────────────────────────────

  describe('updateAttribute', () => {
    const existing = { id: 'attr-1', nameEn: 'Color', version: 2 };

    it('should update attribute fields on version match', async () => {
      mockAttributesRepo.findById.mockResolvedValue(existing);
      mockAttributesRepo.update.mockResolvedValue(undefined);
      mockAttributesRepo.findByIdWithValues.mockResolvedValue({ ...existing, nameEn: 'Colour' });

      await service.updateAttribute(
        tenantId,
        'attr-1',
        { version: 2, nameEn: 'Colour' } as any,
        auditContext,
      );

      expect(mockAttributesRepo.update).toHaveBeenCalledWith(
        tenantId,
        'attr-1',
        expect.arrayContaining(['"nameEn" = :nameEn']),
        expect.objectContaining({ nameEn: 'Colour', updatedBy: 'user-001' }),
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      mockAttributesRepo.findById.mockResolvedValue(existing);

      await expect(
        service.updateAttribute(tenantId, 'attr-1', { version: 1 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when attribute does not exist', async () => {
      mockAttributesRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateAttribute(tenantId, 'missing', { version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeAttribute ────────────────────────────────────────────────────────

  describe('removeAttribute', () => {
    it('should soft-delete existing attribute', async () => {
      mockAttributesRepo.findById.mockResolvedValue({ id: 'attr-1' });

      await service.removeAttribute(tenantId, 'attr-1', auditContext);

      expect(mockAttributesRepo.softDelete).toHaveBeenCalledWith(tenantId, 'attr-1', 'user-001');
    });

    it('should throw NotFoundException when attribute not found', async () => {
      mockAttributesRepo.findById.mockResolvedValue(null);

      await expect(service.removeAttribute(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getAttributeDropdown ───────────────────────────────────────────────────

  describe('getAttributeDropdown', () => {
    it('should delegate to repository with search and limit', async () => {
      const dropdownItems = [{ id: 'attr-1', nameEn: 'Color' }];
      mockAttributesRepo.findForDropdown.mockResolvedValue(dropdownItems);

      const result = await service.getAttributeDropdown(tenantId, { search: 'col', limit: 10 });

      expect(mockAttributesRepo.findForDropdown).toHaveBeenCalledWith(tenantId, {
        search: 'col',
        limit: 10,
      });
      expect(result).toEqual(dropdownItems);
    });
  });

  // ── findAttributeValues ────────────────────────────────────────────────────

  describe('findAttributeValues', () => {
    it('should return paginated values for an attribute', async () => {
      mockAttributesRepo.findById.mockResolvedValue({ id: 'attr-1' });
      mockValuesRepo.findAllByAttribute.mockResolvedValue({
        rows: [{ id: 'val-1', nameEn: 'Red' }],
        total: 1,
      });

      const result = await service.findAttributeValues(tenantId, 'attr-1', new PaginationDto());

      expect(mockValuesRepo.findAllByAttribute).toHaveBeenCalledWith(tenantId, 'attr-1', {
        limit: 20,
        offset: 0,
        search: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException when attribute does not exist', async () => {
      mockAttributesRepo.findById.mockResolvedValue(null);

      await expect(
        service.findAttributeValues(tenantId, 'missing', new PaginationDto()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── createAttributeValue ───────────────────────────────────────────────────

  describe('createAttributeValue', () => {
    it('should create value with defaults', async () => {
      mockAttributesRepo.findById.mockResolvedValue({ id: 'attr-1' });
      mockValuesRepo.create.mockResolvedValue('val-new');
      mockValuesRepo.findById.mockResolvedValue({
        id: 'val-new',
        nameEn: 'Red',
        nameAr: 'احمر',
      });

      const result = await service.createAttributeValue(
        tenantId,
        'attr-1',
        { nameEn: 'Red', nameAr: 'احمر' } as any,
        auditContext,
      );

      expect(mockValuesRepo.create).toHaveBeenCalledWith(tenantId, {
        attributeId: 'attr-1',
        nameEn: 'Red',
        nameAr: 'احمر',
        htmlColor: null,
        sequence: 0,
        createdBy: 'user-001',
      });
      expect(result.id).toBe('val-new');
    });

    it('should create value with htmlColor', async () => {
      mockAttributesRepo.findById.mockResolvedValue({ id: 'attr-1' });
      mockValuesRepo.create.mockResolvedValue('val-red');
      mockValuesRepo.findById.mockResolvedValue({ id: 'val-red' });

      await service.createAttributeValue(
        tenantId,
        'attr-1',
        { nameEn: 'Red', nameAr: 'احمر', htmlColor: '#FF0000', sequence: 1 } as any,
        auditContext,
      );

      expect(mockValuesRepo.create).toHaveBeenCalledWith(tenantId, {
        attributeId: 'attr-1',
        nameEn: 'Red',
        nameAr: 'احمر',
        htmlColor: '#FF0000',
        sequence: 1,
        createdBy: 'user-001',
      });
    });

    it('should throw NotFoundException when attribute does not exist', async () => {
      mockAttributesRepo.findById.mockResolvedValue(null);

      await expect(
        service.createAttributeValue(tenantId, 'missing', { nameEn: 'X' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateAttributeValue ───────────────────────────────────────────────────

  describe('updateAttributeValue', () => {
    const existingVal = { id: 'val-1', nameEn: 'Red', version: 3 };

    it('should update value fields on version match', async () => {
      mockValuesRepo.findById
        .mockResolvedValueOnce(existingVal)
        .mockResolvedValueOnce({ ...existingVal, nameEn: 'Crimson' });
      mockValuesRepo.update.mockResolvedValue(undefined);

      const result = await service.updateAttributeValue(
        tenantId,
        'val-1',
        { version: 3, nameEn: 'Crimson' } as any,
        auditContext,
      );

      expect(mockValuesRepo.update).toHaveBeenCalledWith(
        tenantId,
        'val-1',
        expect.arrayContaining(['"nameEn" = :nameEn']),
        expect.objectContaining({ nameEn: 'Crimson' }),
      );
      expect(result.nameEn).toBe('Crimson');
    });

    it('should throw ConflictException on version mismatch', async () => {
      mockValuesRepo.findById.mockResolvedValue(existingVal);

      await expect(
        service.updateAttributeValue(tenantId, 'val-1', { version: 0 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when value not found', async () => {
      mockValuesRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateAttributeValue(tenantId, 'missing', { version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeAttributeValue ───────────────────────────────────────────────────

  describe('removeAttributeValue', () => {
    it('should soft-delete existing value', async () => {
      mockValuesRepo.findById.mockResolvedValue({ id: 'val-1' });

      await service.removeAttributeValue(tenantId, 'val-1', auditContext);

      expect(mockValuesRepo.softDelete).toHaveBeenCalledWith(tenantId, 'val-1', 'user-001');
    });

    it('should throw NotFoundException when value not found', async () => {
      mockValuesRepo.findById.mockResolvedValue(null);

      await expect(service.removeAttributeValue(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
