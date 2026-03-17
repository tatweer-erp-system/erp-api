// Mock uuid before any imports that depend on it (BaseEntity uses uuid)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/taxes.repository', () => ({
  TaxesRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { TaxesRepository } from '@/database/sql/repositories/taxes.repository';
import { TaxType, TaxScope } from '@/common/enums/accounting-new.enums';

describe('TaxesService', () => {
  let service: TaxesService;

  const mockTaxesRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdOrNull: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxesService, { provide: TaxesRepository, useValue: mockTaxesRepo }],
    }).compile();

    service = module.get<TaxesService>(TaxesService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated taxes with default sort', async () => {
      const expected = { data: [{ id: 't1', nameEn: 'VAT 15%' }], meta: { total: 1 } };
      mockTaxesRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll(tenantId, {} as any);

      expect(mockTaxesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          where: {},
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          searchFields: ['nameEn', 'nameAr'],
        }),
      );
      expect(result).toEqual(expected);
    });

    it('should filter by scope when provided', async () => {
      mockTaxesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { scope: TaxScope.SALE } as any);

      expect(mockTaxesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scope: TaxScope.SALE },
        }),
      );
    });

    it('should filter by isActive when provided', async () => {
      mockTaxesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { isActive: true } as any);

      expect(mockTaxesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should pass search parameter', async () => {
      mockTaxesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { search: 'vat' } as any);

      expect(mockTaxesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'vat' }),
      );
    });

    it('should combine scope and isActive filters', async () => {
      mockTaxesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { scope: TaxScope.PURCHASE, isActive: false } as any);

      expect(mockTaxesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scope: TaxScope.PURCHASE, isActive: false },
        }),
      );
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return tax when found', async () => {
      const tax = { id: 't1', nameEn: 'VAT 15%', type: TaxType.PERCENTAGE, amount: 15 };
      mockTaxesRepo.findById.mockResolvedValue(tax);

      const result = await service.findById(tenantId, 't1');

      expect(result).toEqual(tax);
      expect(mockTaxesRepo.findById).toHaveBeenCalledWith('t1', { tenantId });
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      nameEn: 'VAT 15%',
      nameAr: 'ضريبة القيمة المضافة 15%',
    };

    it('should create a percentage tax with defaults', async () => {
      const created = { id: 't1', ...baseDto, type: TaxType.PERCENTAGE, amount: 15 };
      mockTaxesRepo.create.mockResolvedValue(created);

      const result = await service.create(tenantId, baseDto as any, auditContext);

      expect(mockTaxesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: baseDto.nameEn,
          nameAr: baseDto.nameAr,
          type: TaxType.PERCENTAGE,
          amount: 15.0,
          scope: TaxScope.BOTH,
          includeInPrice: false,
          taxGroupId: null,
          saleAccountId: null,
          purchaseAccountId: null,
          isActive: true,
        }),
        { tenantId, auditContext },
      );
      expect(result).toEqual(created);
    });

    it('should create a fixed tax when type is FIXED', async () => {
      mockTaxesRepo.create.mockResolvedValue({ id: 't2' });

      await service.create(
        tenantId,
        { ...baseDto, type: TaxType.FIXED, amount: 5 } as any,
        auditContext,
      );

      expect(mockTaxesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TaxType.FIXED,
          amount: 5,
        }),
        expect.any(Object),
      );
    });

    it('should set scope to SALE when provided', async () => {
      mockTaxesRepo.create.mockResolvedValue({ id: 't3' });

      await service.create(tenantId, { ...baseDto, scope: TaxScope.SALE } as any, auditContext);

      expect(mockTaxesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ scope: TaxScope.SALE }),
        expect.any(Object),
      );
    });

    it('should link to a tax group when taxGroupId is provided', async () => {
      mockTaxesRepo.create.mockResolvedValue({ id: 't4' });

      await service.create(tenantId, { ...baseDto, taxGroupId: 'tg-1' } as any, auditContext);

      expect(mockTaxesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ taxGroupId: 'tg-1' }),
        expect.any(Object),
      );
    });

    it('should create inactive tax when isActive=false', async () => {
      mockTaxesRepo.create.mockResolvedValue({ id: 't5' });

      await service.create(tenantId, { ...baseDto, isActive: false } as any, auditContext);

      expect(mockTaxesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
        expect.any(Object),
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update tax when it exists', async () => {
      const existing = { id: 't1', nameEn: 'VAT 15%' };
      mockTaxesRepo.findByIdOrNull.mockResolvedValue(existing);
      mockTaxesRepo.update.mockResolvedValue({ ...existing, nameEn: 'VAT 10%' });

      const result = await service.update(
        tenantId,
        't1',
        { nameEn: 'VAT 10%', version: 0 } as any,
        auditContext,
      );

      expect(mockTaxesRepo.update).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ nameEn: 'VAT 10%' }),
        { tenantId, auditContext },
      );
      expect(result.nameEn).toBe('VAT 10%');
    });

    it('should throw NotFoundException when tax does not exist', async () => {
      mockTaxesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { nameEn: 'X', version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should strip version from update data', async () => {
      mockTaxesRepo.findByIdOrNull.mockResolvedValue({ id: 't1' });
      mockTaxesRepo.update.mockResolvedValue({ id: 't1' });

      await service.update(tenantId, 't1', { nameEn: 'New', version: 2 } as any, auditContext);

      const updateCall = mockTaxesRepo.update.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('version');
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete tax when found', async () => {
      mockTaxesRepo.findByIdOrNull.mockResolvedValue({ id: 't1' });

      await service.remove(tenantId, 't1', auditContext);

      expect(mockTaxesRepo.softDelete).toHaveBeenCalledWith('t1', { tenantId, auditContext });
    });

    it('should throw NotFoundException when tax does not exist', async () => {
      mockTaxesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
