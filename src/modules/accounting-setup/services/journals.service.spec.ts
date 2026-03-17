jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/journals.repository', () => ({
  JournalsRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { JournalsService } from './journals.service';
import { JournalsRepository } from '@/database/sql/repositories/journals.repository';
import { JournalType } from '@/common/enums/accounting-new.enums';

describe('JournalsService', () => {
  let service: JournalsService;

  const mockJournalsRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdOrNull: jest.fn(),
    existsByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [JournalsService, { provide: JournalsRepository, useValue: mockJournalsRepo }],
    }).compile();

    service = module.get<JournalsService>(JournalsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated journals with default sort by code ASC', async () => {
      const expected = { data: [{ id: 'j1', code: 'SINV' }], meta: { total: 1 } };
      mockJournalsRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll(tenantId, {} as any);

      expect(mockJournalsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          where: {},
          sortBy: 'code',
          sortOrder: 'ASC',
          searchFields: ['nameEn', 'nameAr', 'code'],
        }),
      );
      expect(result).toEqual(expected);
    });

    it('should filter by type when provided', async () => {
      mockJournalsRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { type: JournalType.SALE } as any);

      expect(mockJournalsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: JournalType.SALE } }),
      );
    });

    it('should filter by isActive when provided', async () => {
      mockJournalsRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { isActive: true } as any);

      expect(mockJournalsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should combine type and isActive filters', async () => {
      mockJournalsRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { type: JournalType.BANK, isActive: false } as any);

      expect(mockJournalsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: JournalType.BANK, isActive: false },
        }),
      );
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return journal by id', async () => {
      const journal = { id: 'j1', code: 'SINV', type: JournalType.SALE };
      mockJournalsRepo.findById.mockResolvedValue(journal);

      const result = await service.findById(tenantId, 'j1');

      expect(result).toEqual(journal);
      expect(mockJournalsRepo.findById).toHaveBeenCalledWith('j1', { tenantId });
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      nameEn: 'Sales Invoice',
      nameAr: 'فاتورة مبيعات',
      type: JournalType.SALE,
      code: 'SINV',
    };

    it('should create a journal with defaults', async () => {
      mockJournalsRepo.existsByCode.mockResolvedValue(false);
      mockJournalsRepo.create.mockResolvedValue({ id: 'j1', ...baseDto });

      const result = await service.create(tenantId, baseDto as any, auditContext);

      expect(mockJournalsRepo.existsByCode).toHaveBeenCalledWith(tenantId, 'SINV');
      expect(mockJournalsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: 'Sales Invoice',
          nameAr: 'فاتورة مبيعات',
          type: JournalType.SALE,
          code: 'SINV',
          defaultAccountId: null,
          suspenseAccountId: null,
          currencyId: null,
          sequencePrefix: null,
          isActive: true,
        }),
        { tenantId, auditContext },
      );
      expect(result.id).toBe('j1');
    });

    it('should throw ConflictException when code already exists', async () => {
      mockJournalsRepo.existsByCode.mockResolvedValue(true);

      await expect(service.create(tenantId, baseDto as any, auditContext)).rejects.toThrow(
        ConflictException,
      );
      expect(mockJournalsRepo.create).not.toHaveBeenCalled();
    });

    it('should create journal with all optional fields', async () => {
      mockJournalsRepo.existsByCode.mockResolvedValue(false);
      mockJournalsRepo.create.mockResolvedValue({ id: 'j2' });

      await service.create(
        tenantId,
        {
          ...baseDto,
          code: 'CSH1',
          type: JournalType.CASH,
          defaultAccountId: 'acc-1',
          suspenseAccountId: 'acc-2',
          currencyId: 'cur-1',
          sequencePrefix: 'CSH',
          isActive: false,
        } as any,
        auditContext,
      );

      expect(mockJournalsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CSH1',
          type: JournalType.CASH,
          defaultAccountId: 'acc-1',
          suspenseAccountId: 'acc-2',
          currencyId: 'cur-1',
          sequencePrefix: 'CSH',
          isActive: false,
        }),
        expect.any(Object),
      );
    });

    it('should enforce unique code per tenant for different journal types', async () => {
      mockJournalsRepo.existsByCode.mockResolvedValue(true);

      await expect(
        service.create(
          tenantId,
          { ...baseDto, code: 'BNK1', type: JournalType.BANK } as any,
          auditContext,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const existing = { id: 'j1', code: 'SINV', nameEn: 'Sales Invoice' };

    it('should update journal when it exists', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockJournalsRepo.update.mockResolvedValue({ ...existing, nameEn: 'Sales' });

      const result = await service.update(
        tenantId,
        'j1',
        { nameEn: 'Sales', version: 0 } as any,
        auditContext,
      );

      expect(mockJournalsRepo.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({ nameEn: 'Sales' }),
        { tenantId, auditContext },
      );
      expect(result.nameEn).toBe('Sales');
    });

    it('should throw NotFoundException when journal does not exist', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { nameEn: 'X', version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check code uniqueness when code changes', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockJournalsRepo.existsByCode.mockResolvedValue(false);
      mockJournalsRepo.update.mockResolvedValue({ ...existing, code: 'SINV2' });

      await service.update(tenantId, 'j1', { code: 'SINV2', version: 0 } as any, auditContext);

      expect(mockJournalsRepo.existsByCode).toHaveBeenCalledWith(tenantId, 'SINV2');
    });

    it('should not check code uniqueness when code is unchanged', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockJournalsRepo.update.mockResolvedValue(existing);

      await service.update(tenantId, 'j1', { code: 'SINV', version: 0 } as any, auditContext);

      expect(mockJournalsRepo.existsByCode).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new code already exists', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockJournalsRepo.existsByCode.mockResolvedValue(true);

      await expect(
        service.update(tenantId, 'j1', { code: 'PINV', version: 0 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should strip version from update data', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockJournalsRepo.update.mockResolvedValue(existing);

      await service.update(tenantId, 'j1', { nameEn: 'X', version: 3 } as any, auditContext);

      const updateData = mockJournalsRepo.update.mock.calls[0][1];
      expect(updateData).not.toHaveProperty('version');
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete journal when found', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue({ id: 'j1' });

      await service.remove(tenantId, 'j1', auditContext);

      expect(mockJournalsRepo.softDelete).toHaveBeenCalledWith('j1', { tenantId, auditContext });
    });

    it('should throw NotFoundException when journal does not exist', async () => {
      mockJournalsRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
