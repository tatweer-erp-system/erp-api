// Mock uuid before any imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/crm-stages.repository', () => ({
  CrmStagesRepository: jest.fn(),
}));

// Mock CLS for msg() helper
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CrmStagesService } from './crm-stages.service';
import { CrmStagesRepository } from '@/database/sql/repositories/crm-stages.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';

describe('CrmStagesService', () => {
  let service: CrmStagesService;

  const mockCrmStagesRepo = {
    findAll: jest.fn(),
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
      providers: [CrmStagesService, { provide: CrmStagesRepository, useValue: mockCrmStagesRepo }],
    }).compile();

    service = module.get<CrmStagesService>(CrmStagesService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return stages ordered by sequence ASC', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({
        data: [
          { id: 's-1', nameEn: 'New', sequence: 1 },
          { id: 's-2', nameEn: 'Qualified', sequence: 2 },
        ],
        meta: { total: 2 },
      });

      const result = await service.findAll(tenantId, { page: 1, limit: 20 } as PaginationDto);

      expect(mockCrmStagesRepo.findAll).toHaveBeenCalledWith({
        tenantId,
        page: 1,
        limit: 20,
        search: undefined,
        searchFields: ['nameEn', 'nameAr'],
        sortBy: 'sequence',
        sortOrder: 'ASC',
      });
      expect(result.data).toHaveLength(2);
    });

    it('should pass search parameter', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { search: 'won' } as PaginationDto);

      expect(mockCrmStagesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'won' }),
      );
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return stage when found', async () => {
      const stage = { id: 's-1', nameEn: 'New', sequence: 1, isWon: false };
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(stage);

      const result = await service.findById(tenantId, 's-1');

      expect(result).toEqual(stage);
      expect(mockCrmStagesRepo.findByIdOrNull).toHaveBeenCalledWith('s-1', { tenantId });
    });

    it('should throw NotFoundException when stage does not exist', async () => {
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create stage with all fields', async () => {
      const dto = {
        nameEn: 'Qualified',
        nameAr: 'مؤهل',
        sequence: 2,
        probability: 50,
        isWon: false,
        isFolded: false,
      };

      const created = { id: 's-new', ...dto };
      mockCrmStagesRepo.create.mockResolvedValue(created);

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(mockCrmStagesRepo.create).toHaveBeenCalledWith(
        {
          nameEn: 'Qualified',
          nameAr: 'مؤهل',
          sequence: 2,
          probability: 50,
          isWon: false,
          isFolded: false,
        },
        { tenantId, auditContext },
      );
      expect(result).toEqual(created);
    });

    it('should default probability to 20 when not provided', async () => {
      const dto = { nameEn: 'New', nameAr: 'جديد', sequence: 1 };
      mockCrmStagesRepo.create.mockResolvedValue({ id: 's-new', ...dto, probability: 20 });

      await service.create(tenantId, dto as any, auditContext);

      expect(mockCrmStagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ probability: 20 }),
        expect.any(Object),
      );
    });

    it('should default isWon to false when not provided', async () => {
      const dto = { nameEn: 'New', nameAr: 'جديد', sequence: 1 };
      mockCrmStagesRepo.create.mockResolvedValue({ id: 's-new' });

      await service.create(tenantId, dto as any, auditContext);

      expect(mockCrmStagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isWon: false }),
        expect.any(Object),
      );
    });

    it('should default isFolded to false when not provided', async () => {
      const dto = { nameEn: 'New', nameAr: 'جديد', sequence: 1 };
      mockCrmStagesRepo.create.mockResolvedValue({ id: 's-new' });

      await service.create(tenantId, dto as any, auditContext);

      expect(mockCrmStagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isFolded: false }),
        expect.any(Object),
      );
    });

    it('should allow creating a stage with isWon=true (won stage)', async () => {
      const dto = { nameEn: 'Won', nameAr: 'فاز', sequence: 10, probability: 100, isWon: true };
      mockCrmStagesRepo.create.mockResolvedValue({ id: 's-won', ...dto });

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(mockCrmStagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isWon: true, probability: 100 }),
        expect.any(Object),
      );
      expect(result.isWon).toBe(true);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue({
        id: 's-1',
        nameEn: 'New',
        nameAr: 'جديد',
        sequence: 1,
        probability: 10,
      });
    });

    it('should update stage fields', async () => {
      const updated = { id: 's-1', nameEn: 'Updated', probability: 30 };
      mockCrmStagesRepo.update.mockResolvedValue(updated);

      await service.update(
        tenantId,
        's-1',
        { nameEn: 'Updated', probability: 30 } as any,
        auditContext,
      );

      expect(mockCrmStagesRepo.update).toHaveBeenCalledWith(
        's-1',
        { nameEn: 'Updated', probability: 30 },
        { tenantId, auditContext },
      );
    });

    it('should throw NotFoundException when stage does not exist', async () => {
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { nameEn: 'X' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only include provided fields in update data', async () => {
      mockCrmStagesRepo.update.mockResolvedValue({ id: 's-1', sequence: 5 });

      await service.update(tenantId, 's-1', { sequence: 5 } as any, auditContext);

      expect(mockCrmStagesRepo.update).toHaveBeenCalledWith(
        's-1',
        { sequence: 5 },
        expect.any(Object),
      );
    });

    it('should allow updating isWon flag', async () => {
      mockCrmStagesRepo.update.mockResolvedValue({ id: 's-1', isWon: true });

      await service.update(tenantId, 's-1', { isWon: true } as any, auditContext);

      expect(mockCrmStagesRepo.update).toHaveBeenCalledWith(
        's-1',
        expect.objectContaining({ isWon: true }),
        expect.any(Object),
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete the stage', async () => {
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue({ id: 's-1' });

      await service.remove(tenantId, 's-1', auditContext);

      expect(mockCrmStagesRepo.softDelete).toHaveBeenCalledWith('s-1', { tenantId, auditContext });
    });

    it('should throw NotFoundException when stage does not exist', async () => {
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
