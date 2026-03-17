jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { FiscalPeriodStatus } from '@/common/enums/accounting.enums';

describe('FiscalPeriodsService', () => {
  let service: FiscalPeriodsService;
  let periodsRepository: Record<string, jest.Mock>;
  let unifiedSettings: Record<string, jest.Mock>;
  let tenantSettingsRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  const openPeriod = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    tenantId,
    fiscalYear: 2026,
    periodNumber: 3,
    nameEn: 'March 2026',
    nameAr: 'مارس 2026',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: FiscalPeriodStatus.OPEN,
    closedBy: null,
    closedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    periodsRepository = {
      findByTenant: jest.fn().mockResolvedValue([openPeriod()]),
      findByIdAndTenant: jest.fn().mockResolvedValue(openPeriod()),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 99, ...data })),
      update: jest
        .fn()
        .mockImplementation((_id, data) => Promise.resolve({ ...openPeriod(), ...data })),
      findPeriodForDate: jest.fn().mockResolvedValue(openPeriod()),
      getDraftEntryNumbers: jest.fn().mockResolvedValue([]),
    };

    unifiedSettings = {
      get: jest.fn().mockResolvedValue(null),
      invalidate: jest.fn(),
    };

    tenantSettingsRepository = {
      upsertSetting: jest.fn().mockResolvedValue(undefined),
    };

    service = new FiscalPeriodsService(
      periodsRepository as any,
      unifiedSettings as any,
      tenantSettingsRepository as any,
    );
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return periods for tenant', async () => {
      const result = await service.findAll(tenantId);
      expect(result.data).toHaveLength(1);
      expect(periodsRepository.findByTenant).toHaveBeenCalledWith(tenantId);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return period by id', async () => {
      const result = await service.findById(tenantId, 1);
      expect(result).toBeDefined();
    });

    it('should throw if period not found', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(null);
      await expect(service.findById(tenantId, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a period with OPEN status', async () => {
      const dto = {
        fiscalYear: 2026,
        periodNumber: 4,
        periodType: 'monthly',
        nameEn: 'April 2026',
        nameAr: 'أبريل 2026',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      };

      await service.create(tenantId, dto as any, auditContext as any);

      expect(periodsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          status: FiscalPeriodStatus.OPEN,
          fiscalYear: 2026,
          periodNumber: 4,
        }),
        expect.any(Object),
      );
    });
  });

  // ── close ───────────────────────────────────────────────────────────────

  describe('close()', () => {
    it('should close an open period', async () => {
      await service.close(tenantId, 1, auditContext as any);

      expect(periodsRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status: FiscalPeriodStatus.CLOSED,
          closedBy: 'user-001',
          closedAt: expect.any(Date),
        }),
        expect.any(Object),
      );
    });

    it('should throw if period is not open', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(
        openPeriod({ status: FiscalPeriodStatus.CLOSED }),
      );

      await expect(service.close(tenantId, 1, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if period has draft entries', async () => {
      periodsRepository.getDraftEntryNumbers.mockResolvedValue(['JV-0001', 'JV-0002']);

      await expect(service.close(tenantId, 1, auditContext as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw if period not found', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(null);
      await expect(service.close(tenantId, 999, auditContext as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── reopen ──────────────────────────────────────────────────────────────

  describe('reopen()', () => {
    it('should reopen a closed period', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(
        openPeriod({ status: FiscalPeriodStatus.CLOSED }),
      );

      await service.reopen(tenantId, 1, auditContext as any);

      expect(periodsRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status: FiscalPeriodStatus.OPEN,
          closedBy: null,
          closedAt: null,
        }),
        expect.any(Object),
      );
    });

    it('should throw if period is locked', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(
        openPeriod({ status: FiscalPeriodStatus.LOCKED }),
      );

      await expect(service.reopen(tenantId, 1, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if period is already open', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(
        openPeriod({ status: FiscalPeriodStatus.OPEN }),
      );

      await expect(service.reopen(tenantId, 1, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if period not found', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(null);
      await expect(service.reopen(tenantId, 999, auditContext as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── lock ────────────────────────────────────────────────────────────────

  describe('lock()', () => {
    it('should lock a period', async () => {
      await service.lock(tenantId, 1, auditContext as any);

      expect(periodsRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ status: FiscalPeriodStatus.LOCKED }),
        expect.any(Object),
      );
    });

    it('should throw if period is already locked', async () => {
      periodsRepository.findByIdAndTenant.mockResolvedValue(
        openPeriod({ status: FiscalPeriodStatus.LOCKED }),
      );

      await expect(service.lock(tenantId, 1, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── setFiscalLockDate / getFiscalLockDate ───────────────────────────────

  describe('setFiscalLockDate()', () => {
    it('should persist lock date setting', async () => {
      const result = await service.setFiscalLockDate(tenantId, '2026-02-28', auditContext as any);

      expect(tenantSettingsRepository.upsertSetting).toHaveBeenCalledWith(tenantId, {
        key: 'fiscalLockDate',
        value: '2026-02-28',
        group: 'accounting',
        type: 'string',
      });
      expect(unifiedSettings.invalidate).toHaveBeenCalledWith(tenantId, 'fiscalLockDate');
      expect(result.fiscalLockDate).toBe('2026-02-28');
    });
  });

  describe('getFiscalLockDate()', () => {
    it('should return lock date from settings', async () => {
      unifiedSettings.get.mockResolvedValue('2026-02-28');
      const result = await service.getFiscalLockDate(tenantId);
      expect(result).toBe('2026-02-28');
    });

    it('should return null when no lock date set', async () => {
      unifiedSettings.get.mockResolvedValue(null);
      const result = await service.getFiscalLockDate(tenantId);
      expect(result).toBeNull();
    });
  });

  // ── clearFiscalLockDate ─────────────────────────────────────────────────

  describe('clearFiscalLockDate()', () => {
    it('should clear the lock date', async () => {
      const result = await service.clearFiscalLockDate(tenantId, auditContext as any);

      expect(tenantSettingsRepository.upsertSetting).toHaveBeenCalledWith(tenantId, {
        key: 'fiscalLockDate',
        value: '',
        group: 'accounting',
        type: 'string',
      });
      expect(result.fiscalLockDate).toBeNull();
    });
  });

  // ── resolvePeriod ───────────────────────────────────────────────────────

  describe('resolvePeriod()', () => {
    it('should return open period for date', async () => {
      const result = await service.resolvePeriod(tenantId, '2026-03-15');
      expect(result).toBeDefined();
      expect((result as any).status).toBe(FiscalPeriodStatus.OPEN);
    });

    it('should throw if date is before fiscal lock date', async () => {
      unifiedSettings.get.mockResolvedValue('2026-03-31');

      await expect(service.resolvePeriod(tenantId, '2026-03-15')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if date equals fiscal lock date', async () => {
      unifiedSettings.get.mockResolvedValue('2026-03-15');

      await expect(service.resolvePeriod(tenantId, '2026-03-15')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if no period found for date', async () => {
      periodsRepository.findPeriodForDate.mockResolvedValue(null);

      await expect(service.resolvePeriod(tenantId, '2026-03-15')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if period is closed', async () => {
      periodsRepository.findPeriodForDate.mockResolvedValue(
        openPeriod({ status: FiscalPeriodStatus.CLOSED }),
      );

      await expect(service.resolvePeriod(tenantId, '2026-03-15')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if period is locked', async () => {
      periodsRepository.findPeriodForDate.mockResolvedValue(
        openPeriod({ status: FiscalPeriodStatus.LOCKED }),
      );

      await expect(service.resolvePeriod(tenantId, '2026-03-15')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass when date is after lock date', async () => {
      unifiedSettings.get.mockResolvedValue('2026-02-28');

      const result = await service.resolvePeriod(tenantId, '2026-03-15');
      expect(result).toBeDefined();
    });
  });
});
