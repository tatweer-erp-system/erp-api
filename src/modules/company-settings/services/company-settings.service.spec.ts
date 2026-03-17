jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/company-settings.repository', () => ({
  CompanySettingsRepository: jest.fn(),
}));

jest.mock('@/database/sql/repositories/branch-settings.repository', () => ({
  BranchSettingsRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CompanySettingsService } from './company-settings.service';
import { CompanySettingsRepository } from '@/database/sql/repositories/company-settings.repository';
import { BranchSettingsRepository } from '@/database/sql/repositories/branch-settings.repository';

describe('CompanySettingsService', () => {
  let service: CompanySettingsService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockCompanySettingsRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockBranchSettingsRepo = {
    findAllRaw: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createTransaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockBranchSettingsRepo.createTransaction.mockResolvedValue(mockTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanySettingsService,
        { provide: CompanySettingsRepository, useValue: mockCompanySettingsRepo },
        { provide: BranchSettingsRepository, useValue: mockBranchSettingsRepo },
      ],
    }).compile();

    service = module.get<CompanySettingsService>(CompanySettingsService);
  });

  // ── getCompanySettings ──────────────────────────────────────────────────

  describe('getCompanySettings', () => {
    it('should return existing company settings', async () => {
      const settings = {
        id: 'cs1',
        tenantId,
        fiscalLockDate: null,
        angloSaxonAccounting: false,
      };
      mockCompanySettingsRepo.findOne.mockResolvedValue(settings);

      const result = await service.getCompanySettings(tenantId);

      expect(result).toEqual(settings);
      expect(mockCompanySettingsRepo.findOne).toHaveBeenCalledWith({
        tenantId,
        where: { tenantId },
      });
    });

    it('should create and return defaults when no record exists', async () => {
      mockCompanySettingsRepo.findOne.mockResolvedValue(null);
      const defaults = { id: 'cs-new', tenantId };
      mockCompanySettingsRepo.create.mockResolvedValue(defaults);

      const result = await service.getCompanySettings(tenantId);

      expect(mockCompanySettingsRepo.create).toHaveBeenCalledWith(
        { tenantId },
        { tenantId, bypassTenantScope: true },
      );
      expect(result).toEqual(defaults);
    });
  });

  // ── updateCompanySettings ───────────────────────────────────────────────

  describe('updateCompanySettings', () => {
    it('should update existing settings with partial data', async () => {
      const existing = { id: 'cs1', tenantId, angloSaxonAccounting: false };
      mockCompanySettingsRepo.findOne.mockResolvedValue(existing);
      mockCompanySettingsRepo.update.mockResolvedValue({
        ...existing,
        angloSaxonAccounting: true,
      });

      const result = await service.updateCompanySettings(
        tenantId,
        { angloSaxonAccounting: true } as any,
        auditContext,
      );

      expect(mockCompanySettingsRepo.update).toHaveBeenCalledWith(
        'cs1',
        expect.objectContaining({ angloSaxonAccounting: true }),
        { tenantId, auditContext },
      );
      expect(result.angloSaxonAccounting).toBe(true);
    });

    it('should create settings when none exist yet', async () => {
      mockCompanySettingsRepo.findOne.mockResolvedValue(null);
      mockCompanySettingsRepo.create.mockResolvedValue({
        id: 'cs-new',
        tenantId,
        fiscalLockDate: '2026-01-01',
      });

      const result = await service.updateCompanySettings(
        tenantId,
        { fiscalLockDate: '2026-01-01' } as any,
        auditContext,
      );

      expect(mockCompanySettingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId, fiscalLockDate: '2026-01-01' }),
        { tenantId, auditContext, bypassTenantScope: true },
      );
      expect(result.fiscalLockDate).toBe('2026-01-01');
    });

    it('should update multiple fields at once', async () => {
      mockCompanySettingsRepo.findOne.mockResolvedValue({ id: 'cs1', tenantId });
      mockCompanySettingsRepo.update.mockResolvedValue({ id: 'cs1' });

      await service.updateCompanySettings(
        tenantId,
        {
          defaultARAccountId: 'acc-1',
          defaultAPAccountId: 'acc-2',
          taxExigibility: 'on_invoice',
          workDaysPerMonth: 22,
          gosiEmployeePct: 10,
          gosiEmployerPct: 12,
        } as any,
        auditContext,
      );

      expect(mockCompanySettingsRepo.update).toHaveBeenCalledWith(
        'cs1',
        expect.objectContaining({
          defaultARAccountId: 'acc-1',
          defaultAPAccountId: 'acc-2',
          taxExigibility: 'on_invoice',
          workDaysPerMonth: 22,
          gosiEmployeePct: 10,
          gosiEmployerPct: 12,
        }),
        expect.any(Object),
      );
    });

    it('should only include fields that are present in dto', async () => {
      mockCompanySettingsRepo.findOne.mockResolvedValue({ id: 'cs1', tenantId });
      mockCompanySettingsRepo.update.mockResolvedValue({ id: 'cs1' });

      await service.updateCompanySettings(
        tenantId,
        { negativeStockBlock: true } as any,
        auditContext,
      );

      const updateData = mockCompanySettingsRepo.update.mock.calls[0][1];
      expect(updateData).toEqual({ negativeStockBlock: true });
      expect(updateData).not.toHaveProperty('angloSaxonAccounting');
      expect(updateData).not.toHaveProperty('fiscalLockDate');
    });

    it('should handle empty dto gracefully', async () => {
      mockCompanySettingsRepo.findOne.mockResolvedValue({ id: 'cs1', tenantId });
      mockCompanySettingsRepo.update.mockResolvedValue({ id: 'cs1' });

      await service.updateCompanySettings(tenantId, {} as any, auditContext);

      expect(mockCompanySettingsRepo.update).toHaveBeenCalledWith('cs1', {}, expect.any(Object));
    });
  });

  // ── getBranchSettings ──────────────────────────────────────────────────

  describe('getBranchSettings', () => {
    it('should return branch settings as flat key-value object', async () => {
      mockBranchSettingsRepo.findAllRaw.mockResolvedValue([
        { key: 'allow_negative_stock', value: 'true' },
        { key: 'default_warehouse', value: 'wh-001' },
        { key: 'empty_setting', value: null },
      ]);

      const result = await service.getBranchSettings(tenantId, 'branch-1');

      expect(result).toEqual({
        allow_negative_stock: 'true',
        default_warehouse: 'wh-001',
        empty_setting: null,
      });
      expect(mockBranchSettingsRepo.findAllRaw).toHaveBeenCalledWith({
        tenantId,
        where: { branchId: 'branch-1' },
      });
    });

    it('should return empty object when no settings exist', async () => {
      mockBranchSettingsRepo.findAllRaw.mockResolvedValue([]);

      const result = await service.getBranchSettings(tenantId, 'branch-1');

      expect(result).toEqual({});
    });
  });

  // ── updateBranchSettings ───────────────────────────────────────────────

  describe('updateBranchSettings', () => {
    it('should update existing branch setting (upsert: update)', async () => {
      const existingSetting = { id: 'bs1', key: 'allow_negative_stock', value: 'false' };
      mockBranchSettingsRepo.findOne.mockResolvedValue(existingSetting);
      mockBranchSettingsRepo.findAllRaw.mockResolvedValue([
        { key: 'allow_negative_stock', value: 'true' },
      ]);

      await service.updateBranchSettings(
        tenantId,
        'branch-1',
        { settings: [{ key: 'allow_negative_stock', value: 'true' }] } as any,
        auditContext,
      );

      expect(mockBranchSettingsRepo.update).toHaveBeenCalledWith(
        'bs1',
        { value: 'true' },
        { tenantId, transaction: mockTransaction, auditContext },
      );
      expect(mockBranchSettingsRepo.create).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should create new branch setting (upsert: create)', async () => {
      mockBranchSettingsRepo.findOne.mockResolvedValue(null);
      mockBranchSettingsRepo.findAllRaw.mockResolvedValue([{ key: 'new_setting', value: 'abc' }]);

      await service.updateBranchSettings(
        tenantId,
        'branch-1',
        { settings: [{ key: 'new_setting', value: 'abc' }] } as any,
        auditContext,
      );

      expect(mockBranchSettingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'branch-1',
          key: 'new_setting',
          value: 'abc',
        }),
        { tenantId, transaction: mockTransaction, auditContext },
      );
      expect(mockBranchSettingsRepo.update).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should handle multiple settings in one call (mix of update and create)', async () => {
      // First setting exists, second doesn't
      mockBranchSettingsRepo.findOne
        .mockResolvedValueOnce({ id: 'bs1', key: 'existing_key', value: 'old' })
        .mockResolvedValueOnce(null);
      mockBranchSettingsRepo.findAllRaw.mockResolvedValue([]);

      await service.updateBranchSettings(
        tenantId,
        'branch-1',
        {
          settings: [
            { key: 'existing_key', value: 'new' },
            { key: 'brand_new_key', value: 'val' },
          ],
        } as any,
        auditContext,
      );

      expect(mockBranchSettingsRepo.update).toHaveBeenCalledTimes(1);
      expect(mockBranchSettingsRepo.create).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockBranchSettingsRepo.findOne.mockRejectedValue(new Error('DB fail'));

      await expect(
        service.updateBranchSettings(
          tenantId,
          'branch-1',
          { settings: [{ key: 'k', value: 'v' }] } as any,
          auditContext,
        ),
      ).rejects.toThrow('DB fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should return updated branch settings after save', async () => {
      mockBranchSettingsRepo.findOne.mockResolvedValue(null);
      mockBranchSettingsRepo.findAllRaw.mockResolvedValue([
        { key: 'test_key', value: 'test_value' },
      ]);

      const result = await service.updateBranchSettings(
        tenantId,
        'branch-1',
        { settings: [{ key: 'test_key', value: 'test_value' }] } as any,
        auditContext,
      );

      expect(result).toEqual({ test_key: 'test_value' });
    });
  });
});
