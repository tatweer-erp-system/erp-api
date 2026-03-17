// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/supplier-products.repository', () => ({
  SupplierProductsRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SupplierProductsService } from './supplier-products.service';
import { SupplierProductsRepository } from '@/database/sql/repositories/supplier-products.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';

describe('SupplierProductsService', () => {
  let service: SupplierProductsService;

  const mockRepo = {
    findAllPaginated: jest.fn(),
    findOneById: jest.fn(),
    existsByUnique: jest.fn(),
    insertSupplierProduct: jest.fn(),
    updateSupplierProduct: jest.fn(),
    softDeleteSupplierProduct: jest.fn(),
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
        SupplierProductsService,
        { provide: SupplierProductsRepository, useValue: mockRepo },
        { provide: AuditSharedService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SupplierProductsService>(SupplierProductsService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated supplier products with defaults', async () => {
      mockRepo.findAllPaginated.mockResolvedValue({
        rows: [{ id: 'sp-1' }],
        total: 1,
      });

      const result = await service.findAll(tenantId, {} as any);

      expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 20,
        offset: 0,
        productId: undefined,
        partnerId: undefined,
        sortOrder: 'ASC',
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should filter by productId and partnerId', async () => {
      mockRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      await service.findAll(tenantId, {
        productId: 'prod-1',
        partnerId: 'partner-1',
        page: 1,
        limit: 10,
      } as any);

      expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 10,
        offset: 0,
        productId: 'prod-1',
        partnerId: 'partner-1',
        sortOrder: 'ASC',
      });
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return supplier product when found', async () => {
      const record = { id: 'sp-1', productId: 'prod-1', partnerId: 'partner-1' };
      mockRepo.findOneById.mockResolvedValue(record);

      const result = await service.findById(tenantId, 'sp-1');

      expect(result).toEqual(record);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create supplier product and log audit', async () => {
      mockRepo.existsByUnique.mockResolvedValue(false);
      mockRepo.insertSupplierProduct.mockResolvedValue('sp-new');
      const created = { id: 'sp-new', productId: 'prod-1', partnerId: 'partner-1' };
      mockRepo.findOneById.mockResolvedValue(created);

      const result = await service.create(
        tenantId,
        {
          productId: 'prod-1',
          partnerId: 'partner-1',
          minQty: 10,
          price: 50,
          leadTimeDays: 7,
          sequence: 1,
        } as any,
        auditContext,
      );

      expect(mockRepo.existsByUnique).toHaveBeenCalledWith(tenantId, 'prod-1', 'partner-1');
      expect(mockRepo.insertSupplierProduct).toHaveBeenCalledWith(tenantId, {
        productId: 'prod-1',
        partnerId: 'partner-1',
        minQty: 10,
        price: 50,
        currencyId: null,
        leadTimeDays: 7,
        sequence: 1,
        createdBy: 'user-001',
      });
      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'purchasing.supplier_products',
        'sp-new',
        created,
        'user-001',
      );
      expect(result.id).toBe('sp-new');
    });

    it('should throw ConflictException on duplicate product+partner', async () => {
      mockRepo.existsByUnique.mockResolvedValue(true);

      await expect(
        service.create(
          tenantId,
          { productId: 'prod-1', partnerId: 'partner-1' } as any,
          auditContext,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const existing = {
      id: 'sp-1',
      productId: 'prod-1',
      partnerId: 'partner-1',
      price: 50,
    };

    it('should update fields and log audit', async () => {
      mockRepo.findOneById
        .mockResolvedValueOnce(existing) // findById
        .mockResolvedValueOnce({ ...existing, price: 60 }); // after update

      await service.update(tenantId, 'sp-1', { price: 60 } as any, auditContext);

      expect(mockRepo.updateSupplierProduct).toHaveBeenCalledWith(
        tenantId,
        'sp-1',
        expect.arrayContaining(['price = :price']),
        expect.objectContaining({ price: 60 }),
      );
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
    });

    it('should check uniqueness when productId changes', async () => {
      mockRepo.findOneById.mockResolvedValueOnce(existing);
      mockRepo.existsByUnique.mockResolvedValue(true);

      await expect(
        service.update(tenantId, 'sp-1', { productId: 'prod-2' } as any, auditContext),
      ).rejects.toThrow(ConflictException);

      expect(mockRepo.existsByUnique).toHaveBeenCalledWith(tenantId, 'prod-2', 'partner-1', 'sp-1');
    });

    it('should check uniqueness when partnerId changes', async () => {
      mockRepo.findOneById.mockResolvedValueOnce(existing);
      mockRepo.existsByUnique.mockResolvedValue(false);
      mockRepo.findOneById.mockResolvedValueOnce({ ...existing, partnerId: 'partner-2' });

      await service.update(tenantId, 'sp-1', { partnerId: 'partner-2' } as any, auditContext);

      expect(mockRepo.existsByUnique).toHaveBeenCalledWith(tenantId, 'prod-1', 'partner-2', 'sp-1');
    });

    it('should not check uniqueness when neither productId nor partnerId changes', async () => {
      mockRepo.findOneById
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, minQty: 5 });

      await service.update(tenantId, 'sp-1', { minQty: 5 } as any, auditContext);

      expect(mockRepo.existsByUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when supplier product not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { price: 10 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete and log audit', async () => {
      const existing = { id: 'sp-1' };
      mockRepo.findOneById.mockResolvedValue(existing);

      await service.remove(tenantId, 'sp-1', auditContext);

      expect(mockRepo.softDeleteSupplierProduct).toHaveBeenCalledWith(tenantId, 'sp-1', 'user-001');
      expect(mockAuditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'purchasing.supplier_products',
        'sp-1',
        existing,
        'user-001',
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
