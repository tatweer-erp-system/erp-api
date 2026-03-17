// Mock uuid before any imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/fiscal-positions.repository', () => ({
  FiscalPositionsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/fiscal-position-taxes.repository', () => ({
  FiscalPositionTaxesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/fiscal-position-accounts.repository', () => ({
  FiscalPositionAccountsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/partners.repository', () => ({
  PartnersRepository: jest.fn(),
}));

// Mock CLS for msg() helper
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FiscalPositionsService } from './fiscal-positions.service';
import { FiscalPositionsRepository } from '@/database/sql/repositories/fiscal-positions.repository';
import { FiscalPositionTaxesRepository } from '@/database/sql/repositories/fiscal-position-taxes.repository';
import { FiscalPositionAccountsRepository } from '@/database/sql/repositories/fiscal-position-accounts.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';

describe('FiscalPositionsService', () => {
  let service: FiscalPositionsService;

  const mockFiscalPositionsRepo = {
    findAll: jest.fn(),
    findByIdOrNull: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createTransaction: jest.fn(),
  };

  const mockFiscalPositionTaxesRepo = {
    findAllRaw: jest.fn(),
    bulkCreate: jest.fn(),
    hardDelete: jest.fn(),
  };

  const mockFiscalPositionAccountsRepo = {
    findAllRaw: jest.fn(),
    bulkCreate: jest.fn(),
    hardDelete: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPartnersRepo = {
    findOneById: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFiscalPositionsRepo.createTransaction.mockResolvedValue(mockTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalPositionsService,
        { provide: FiscalPositionsRepository, useValue: mockFiscalPositionsRepo },
        { provide: FiscalPositionTaxesRepository, useValue: mockFiscalPositionTaxesRepo },
        { provide: FiscalPositionAccountsRepository, useValue: mockFiscalPositionAccountsRepo },
        { provide: PartnersRepository, useValue: mockPartnersRepo },
      ],
    }).compile();

    service = module.get<FiscalPositionsService>(FiscalPositionsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated fiscal positions', async () => {
      mockFiscalPositionsRepo.findAll.mockResolvedValue({
        data: [{ id: 'fp-1', nameEn: 'Export' }],
        meta: { total: 1 },
      });

      const result = await service.findAll(tenantId, { page: 1, limit: 20 } as PaginationDto);

      expect(mockFiscalPositionsRepo.findAll).toHaveBeenCalledWith({
        tenantId,
        page: 1,
        limit: 20,
        search: undefined,
        searchFields: ['nameEn', 'nameAr'],
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
      expect(result.data).toHaveLength(1);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return fiscal position with tax and account mappings', async () => {
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue({
        id: 'fp-1',
        nameEn: 'Export',
      });
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([
        { id: 'tm-1', taxSrcId: 'tax-1', taxDestId: 'tax-2' },
      ]);
      mockFiscalPositionAccountsRepo.findAllRaw.mockResolvedValue([
        { id: 'am-1', accountSrcId: 'acc-1', accountDestId: 'acc-2' },
      ]);

      const result = await service.findById(tenantId, 'fp-1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'fp-1',
          nameEn: 'Export',
          taxMappings: [{ id: 'tm-1', taxSrcId: 'tax-1', taxDestId: 'tax-2' }],
          accountMappings: [{ id: 'am-1', accountSrcId: 'acc-1', accountDestId: 'acc-2' }],
        }),
      );
    });

    it('should throw NotFoundException when fiscal position does not exist', async () => {
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      nameEn: 'Export Position',
      nameAr: 'موقف التصدير',
      autoDetect: true,
      country: 'US',
      note: 'For US exports',
      taxMappings: [{ taxSrcId: 'tax-1', taxDestId: 'tax-2' }],
      accountMappings: [{ accountSrcId: 'acc-1', accountDestId: 'acc-2' }],
    };

    beforeEach(() => {
      mockFiscalPositionsRepo.create.mockResolvedValue({ id: 'fp-new', nameEn: 'Export Position' });
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue({
        id: 'fp-new',
        nameEn: 'Export Position',
      });
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([]);
      mockFiscalPositionAccountsRepo.findAllRaw.mockResolvedValue([]);
    });

    it('should create fiscal position with tax and account mappings in transaction', async () => {
      await service.create(tenantId, createDto as any, auditContext);

      expect(mockFiscalPositionsRepo.createTransaction).toHaveBeenCalled();
      expect(mockFiscalPositionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: 'Export Position',
          nameAr: 'موقف التصدير',
          autoDetect: true,
          country: 'US',
          note: 'For US exports',
          isActive: true,
        }),
        { tenantId, transaction: mockTransaction, auditContext },
      );
    });

    it('should bulk create tax mappings', async () => {
      await service.create(tenantId, createDto as any, auditContext);

      expect(mockFiscalPositionTaxesRepo.bulkCreate).toHaveBeenCalledWith({
        data: [{ fiscalPositionId: 'fp-new', taxSrcId: 'tax-1', taxDestId: 'tax-2' }],
        tenantId,
        transaction: mockTransaction,
        auditContext,
      });
    });

    it('should bulk create account mappings', async () => {
      await service.create(tenantId, createDto as any, auditContext);

      expect(mockFiscalPositionAccountsRepo.bulkCreate).toHaveBeenCalledWith({
        data: [{ fiscalPositionId: 'fp-new', accountSrcId: 'acc-1', accountDestId: 'acc-2' }],
        tenantId,
        transaction: mockTransaction,
        auditContext,
      });
    });

    it('should commit transaction on success', async () => {
      await service.create(tenantId, createDto as any, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockFiscalPositionsRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(tenantId, createDto as any, auditContext)).rejects.toThrow(
        'DB error',
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should skip tax mappings if not provided', async () => {
      const dtoNoMappings = { nameEn: 'Simple', nameAr: 'بسيط' };
      mockFiscalPositionsRepo.create.mockResolvedValue({ id: 'fp-simple' });
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue({ id: 'fp-simple' });

      await service.create(tenantId, dtoNoMappings as any, auditContext);

      expect(mockFiscalPositionTaxesRepo.bulkCreate).not.toHaveBeenCalled();
      expect(mockFiscalPositionAccountsRepo.bulkCreate).not.toHaveBeenCalled();
    });

    it('should set taxDestId to null when not provided (tax removal)', async () => {
      const dtoWithRemoval = {
        nameEn: 'Tax Remove',
        nameAr: 'إزالة ضريبة',
        taxMappings: [{ taxSrcId: 'tax-1' }],
      };
      mockFiscalPositionsRepo.create.mockResolvedValue({ id: 'fp-rem' });
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue({ id: 'fp-rem' });

      await service.create(tenantId, dtoWithRemoval as any, auditContext);

      expect(mockFiscalPositionTaxesRepo.bulkCreate).toHaveBeenCalledWith({
        data: [{ fiscalPositionId: 'fp-rem', taxSrcId: 'tax-1', taxDestId: null }],
        tenantId,
        transaction: mockTransaction,
        auditContext,
      });
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue({
        id: 'fp-1',
        nameEn: 'Old',
      });
    });

    it('should throw NotFoundException when fiscal position does not exist', async () => {
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValueOnce(null);

      await expect(
        service.update(tenantId, 'missing', { nameEn: 'X' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update fiscal position fields', async () => {
      mockFiscalPositionsRepo.update.mockResolvedValue({ id: 'fp-1', nameEn: 'Updated' });
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([]);
      mockFiscalPositionAccountsRepo.findAllRaw.mockResolvedValue([]);

      await service.update(tenantId, 'fp-1', { nameEn: 'Updated' } as any, auditContext);

      expect(mockFiscalPositionsRepo.update).toHaveBeenCalledWith(
        'fp-1',
        { nameEn: 'Updated' },
        { tenantId, transaction: mockTransaction, auditContext },
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should replace tax mappings: delete old, insert new', async () => {
      mockFiscalPositionTaxesRepo.findAllRaw
        .mockResolvedValueOnce([{ id: 'tm-old', taxSrcId: 'tax-old', taxDestId: 'tax-old-dest' }]) // for delete
        .mockResolvedValueOnce([]); // for findById refetch
      mockFiscalPositionAccountsRepo.findAllRaw.mockResolvedValue([]);

      await service.update(
        tenantId,
        'fp-1',
        {
          taxMappings: [{ taxSrcId: 'tax-new', taxDestId: 'tax-new-dest' }],
        } as any,
        auditContext,
      );

      // Old mapping deleted
      expect(mockFiscalPositionTaxesRepo.hardDelete).toHaveBeenCalledWith('tm-old', {
        tenantId,
        transaction: mockTransaction,
      });

      // New mapping inserted
      expect(mockFiscalPositionTaxesRepo.bulkCreate).toHaveBeenCalledWith({
        data: [{ fiscalPositionId: 'fp-1', taxSrcId: 'tax-new', taxDestId: 'tax-new-dest' }],
        tenantId,
        transaction: mockTransaction,
        auditContext,
      });
    });

    it('should replace account mappings: delete old, insert new', async () => {
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([]);
      mockFiscalPositionAccountsRepo.findAllRaw
        .mockResolvedValueOnce([
          { id: 'am-old', accountSrcId: 'acc-old', accountDestId: 'acc-old-dest' },
        ])
        .mockResolvedValueOnce([]);

      await service.update(
        tenantId,
        'fp-1',
        {
          accountMappings: [{ accountSrcId: 'acc-new', accountDestId: 'acc-new-dest' }],
        } as any,
        auditContext,
      );

      expect(mockFiscalPositionAccountsRepo.hardDelete).toHaveBeenCalledWith('am-old', {
        tenantId,
        transaction: mockTransaction,
      });

      expect(mockFiscalPositionAccountsRepo.bulkCreate).toHaveBeenCalledWith({
        data: [
          { fiscalPositionId: 'fp-1', accountSrcId: 'acc-new', accountDestId: 'acc-new-dest' },
        ],
        tenantId,
        transaction: mockTransaction,
        auditContext,
      });
    });

    it('should rollback transaction on error', async () => {
      mockFiscalPositionsRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.update(tenantId, 'fp-1', { nameEn: 'X' } as any, auditContext),
      ).rejects.toThrow('Update failed');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete the fiscal position', async () => {
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue({ id: 'fp-1' });

      await service.remove(tenantId, 'fp-1', auditContext);

      expect(mockFiscalPositionsRepo.softDelete).toHaveBeenCalledWith('fp-1', {
        tenantId,
        auditContext,
      });
    });

    it('should throw NotFoundException when fiscal position does not exist', async () => {
      mockFiscalPositionsRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── resolve (tax remapping) ──────────────────────────────────────────────────

  describe('resolve', () => {
    it('should return original taxIds when partner has no fiscal position', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({
        id: 'partner-1',
        fiscalPositionId: null,
      });

      const result = await service.resolve(tenantId, {
        partnerId: 'partner-1',
        taxIds: ['tax-1', 'tax-2'],
      } as any);

      expect(result).toEqual({ taxIds: ['tax-1', 'tax-2'] });
    });

    it('should remap taxes: src to dest', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({
        id: 'partner-1',
        fiscalPositionId: 'fp-1',
      });
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([
        { taxSrcId: 'tax-1', taxDestId: 'tax-mapped' },
      ]);

      const result = await service.resolve(tenantId, {
        partnerId: 'partner-1',
        taxIds: ['tax-1', 'tax-2'],
      } as any);

      expect(result).toEqual({
        taxIds: ['tax-mapped', 'tax-2'],
        fiscalPositionId: 'fp-1',
      });
    });

    it('should remove tax when dest is null', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({
        id: 'partner-1',
        fiscalPositionId: 'fp-1',
      });
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([
        { taxSrcId: 'tax-1', taxDestId: null },
      ]);

      const result = await service.resolve(tenantId, {
        partnerId: 'partner-1',
        taxIds: ['tax-1', 'tax-2'],
      } as any);

      expect(result).toEqual({
        taxIds: ['tax-2'],
        fiscalPositionId: 'fp-1',
      });
    });

    it('should keep unmapped taxes unchanged', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({
        id: 'partner-1',
        fiscalPositionId: 'fp-1',
      });
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([
        { taxSrcId: 'tax-99', taxDestId: 'tax-mapped' },
      ]);

      const result = await service.resolve(tenantId, {
        partnerId: 'partner-1',
        taxIds: ['tax-1', 'tax-2'],
      } as any);

      // Neither tax-1 nor tax-2 are mapped, so they stay
      expect(result.taxIds).toEqual(['tax-1', 'tax-2']);
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue(null);

      await expect(
        service.resolve(tenantId, { partnerId: 'missing', taxIds: ['tax-1'] } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle multiple tax mappings', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({
        id: 'partner-1',
        fiscalPositionId: 'fp-1',
      });
      mockFiscalPositionTaxesRepo.findAllRaw.mockResolvedValue([
        { taxSrcId: 'tax-1', taxDestId: 'tax-1-mapped' },
        { taxSrcId: 'tax-2', taxDestId: null }, // removed
        { taxSrcId: 'tax-3', taxDestId: 'tax-3-mapped' },
      ]);

      const result = await service.resolve(tenantId, {
        partnerId: 'partner-1',
        taxIds: ['tax-1', 'tax-2', 'tax-3', 'tax-4'],
      } as any);

      expect(result.taxIds).toEqual(['tax-1-mapped', 'tax-3-mapped', 'tax-4']);
    });
  });

  // ── resolveAccounts ──────────────────────────────────────────────────────────

  describe('resolveAccounts', () => {
    it('should return mapped account when mapping exists', async () => {
      mockFiscalPositionAccountsRepo.findOne.mockResolvedValue({
        accountSrcId: 'acc-1',
        accountDestId: 'acc-mapped',
      });

      const result = await service.resolveAccounts(tenantId, 'fp-1', 'acc-1');

      expect(result).toBe('acc-mapped');
      expect(mockFiscalPositionAccountsRepo.findOne).toHaveBeenCalledWith({
        tenantId,
        where: { fiscalPositionId: 'fp-1', accountSrcId: 'acc-1' },
      });
    });

    it('should return original account when no mapping exists', async () => {
      mockFiscalPositionAccountsRepo.findOne.mockResolvedValue(null);

      const result = await service.resolveAccounts(tenantId, 'fp-1', 'acc-1');

      expect(result).toBe('acc-1');
    });
  });
});
