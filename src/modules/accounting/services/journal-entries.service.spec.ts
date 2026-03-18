jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntryType, FiscalPeriodStatus } from '@/common/enums/accounting.enums';
import { JournalEntryTypeNew, JournalType } from '@/common/enums/accounting-new.enums';

describe('JournalEntriesService', () => {
  let service: JournalEntriesService;
  let journalEntriesRepository: Record<string, jest.Mock>;
  let journalLinesRepository: Record<string, jest.Mock>;
  let coaRepository: Record<string, jest.Mock>;
  let journalsRepository: Record<string, jest.Mock>;
  let fiscalPeriodsService: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let unifiedSettings: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const entryId = 'entry-001';
  const auditContext = { userId: 'user-001' };

  const activeAccount = (overrides: Record<string, unknown> = {}) => ({
    id: 'acc-001',
    code: '1000',
    allowDirectPosting: true,
    isActive: true,
    isDeprecated: false,
    isReconcilable: false,
    ...overrides,
  });

  const balancedLines = [
    { accountId: 'acc-001', debit: 100, credit: 0 },
    { accountId: 'acc-002', debit: 0, credit: 100 },
  ];

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    journalEntriesRepository = {
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      create: jest.fn().mockResolvedValue({ id: entryId }),
      findByIdWithLines: jest.fn().mockResolvedValue({
        id: entryId,
        entryNumber: 'JV-0001',
        isPosted: false,
        isReversed: false,
        lines: [],
      }),
      findByIdOrNull: jest.fn().mockResolvedValue({
        id: entryId,
        entryNumber: 'JV-0001',
        entryDate: '2026-03-15',
        isPosted: false,
        isReversed: false,
        journalId: 'journal-001',
      }),
      nextEntryNumberForJournal: jest.fn().mockResolvedValue('JV-0001'),
      update: jest.fn().mockResolvedValue({}),
      softDelete: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };

    journalLinesRepository = {
      bulkInsertLines: jest.fn().mockResolvedValue(undefined),
      findByEntryId: jest.fn().mockResolvedValue([
        { accountId: 'acc-001', debit: 100, credit: 0 },
        { accountId: 'acc-002', debit: 0, credit: 100 },
      ]),
      deleteByEntryId: jest.fn().mockResolvedValue(undefined),
    };

    coaRepository = {
      findByIdOrNull: jest.fn().mockResolvedValue(activeAccount()),
    };

    journalsRepository = {
      findByIdOrNull: jest.fn().mockResolvedValue({
        id: 'journal-001',
        sequencePrefix: 'JV',
      }),
      findByType: jest.fn().mockResolvedValue({
        id: 'journal-001',
        sequencePrefix: 'JV',
      }),
    };

    fiscalPeriodsService = {
      resolvePeriod: jest.fn().mockResolvedValue({
        id: 'period-001',
        status: FiscalPeriodStatus.OPEN,
      }),
    };

    currencyService = {};

    unifiedSettings = {
      get: jest.fn().mockResolvedValue(null),
    };

    service = new JournalEntriesService(
      journalEntriesRepository as any,
      journalLinesRepository as any,
      coaRepository as any,
      journalsRepository as any,
      fiscalPeriodsService as any,
      currencyService as any,
      unifiedSettings as any,
    );
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a draft entry with balanced lines', async () => {
      coaRepository.findByIdOrNull
        .mockResolvedValueOnce(activeAccount({ id: 'acc-001', code: '1000' }))
        .mockResolvedValueOnce(activeAccount({ id: 'acc-002', code: '2000' }));

      await service.create(
        tenantId,
        {
          entryDate: '2026-03-15',
          lines: balancedLines,
        } as any,
        auditContext as any,
      );

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isPosted: false, isReversed: false }),
        expect.any(Object),
      );
      expect(journalLinesRepository.bulkInsertLines).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should default entryType to MANUAL when not provided', async () => {
      coaRepository.findByIdOrNull
        .mockResolvedValueOnce(activeAccount())
        .mockResolvedValueOnce(activeAccount({ id: 'acc-002', code: '2000' }));

      await service.create(
        tenantId,
        { entryDate: '2026-03-15', lines: balancedLines } as any,
        auditContext as any,
      );

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: JournalEntryType.MANUAL,
          entryTypeNew: JournalEntryTypeNew.MANUAL,
        }),
        expect.any(Object),
      );
    });

    it('should resolve default general journal when no journalId provided', async () => {
      coaRepository.findByIdOrNull
        .mockResolvedValueOnce(activeAccount())
        .mockResolvedValueOnce(activeAccount({ id: 'acc-002', code: '2000' }));

      await service.create(
        tenantId,
        { entryDate: '2026-03-15', lines: balancedLines } as any,
        auditContext as any,
      );

      expect(journalsRepository.findByType).toHaveBeenCalledWith(
        tenantId,
        JournalType.GENERAL,
        mockTransaction,
      );
    });

    it('should throw on unbalanced lines (DR != CR)', async () => {
      const unbalanced = [
        { accountId: 'acc-001', debit: 100, credit: 0 },
        { accountId: 'acc-002', debit: 0, credit: 50 },
      ];

      coaRepository.findByIdOrNull
        .mockResolvedValueOnce(activeAccount())
        .mockResolvedValueOnce(activeAccount({ id: 'acc-002' }));

      await expect(
        service.create(
          tenantId,
          { entryDate: '2026-03-15', lines: unbalanced } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw on empty lines', async () => {
      await expect(
        service.create(
          tenantId,
          { entryDate: '2026-03-15', lines: [] } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if a line has both debit and credit > 0', async () => {
      const invalidLines = [{ accountId: 'acc-001', debit: 100, credit: 100 }];

      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount());

      await expect(
        service.create(
          tenantId,
          { entryDate: '2026-03-15', lines: invalidLines } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when account not found', async () => {
      coaRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.create(
          tenantId,
          {
            entryDate: '2026-03-15',
            lines: [
              { accountId: 'missing', debit: 100, credit: 0 },
              { accountId: 'acc-002', debit: 0, credit: 100 },
            ],
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when deprecated account is used', async () => {
      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount({ isDeprecated: true }));

      await expect(
        service.create(
          tenantId,
          {
            entryDate: '2026-03-15',
            lines: [
              { accountId: 'acc-001', debit: 100, credit: 0 },
              { accountId: 'acc-002', debit: 0, credit: 100 },
            ],
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when inactive account is used', async () => {
      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount({ isActive: false }));

      await expect(
        service.create(
          tenantId,
          {
            entryDate: '2026-03-15',
            lines: [
              { accountId: 'acc-001', debit: 100, credit: 0 },
              { accountId: 'acc-002', debit: 0, credit: 100 },
            ],
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when account does not allow direct posting', async () => {
      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount({ allowDirectPosting: false }));

      await expect(
        service.create(
          tenantId,
          {
            entryDate: '2026-03-15',
            lines: [
              { accountId: 'acc-001', debit: 100, credit: 0 },
              { accountId: 'acc-002', debit: 0, credit: 100 },
            ],
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when reconcilable account is used without partnerId', async () => {
      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount({ isReconcilable: true }));

      await expect(
        service.create(
          tenantId,
          {
            entryDate: '2026-03-15',
            lines: [
              { accountId: 'acc-001', debit: 100, credit: 0 },
              { accountId: 'acc-002', debit: 0, credit: 100 },
            ],
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on error', async () => {
      coaRepository.findByIdOrNull.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create(
          tenantId,
          {
            entryDate: '2026-03-15',
            lines: [
              { accountId: 'acc-001', debit: 100, credit: 0 },
              { accountId: 'acc-002', debit: 0, credit: 100 },
            ],
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow('DB error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── post ────────────────────────────────────────────────────────────────

  describe('post()', () => {
    it('should post a draft entry and set isPosted=true', async () => {
      await service.post(tenantId, entryId, auditContext as any);

      expect(journalEntriesRepository.update).toHaveBeenCalledWith(
        entryId,
        expect.objectContaining({ isPosted: true }),
        expect.any(Object),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should set postedAt and postedBy on post', async () => {
      await service.post(tenantId, entryId, auditContext as any);

      expect(journalEntriesRepository.update).toHaveBeenCalledWith(
        entryId,
        expect.objectContaining({
          postedBy: 'user-001',
          postedAt: expect.any(Date),
        }),
        expect.any(Object),
      );
    });

    it('should assign periodId from fiscal period', async () => {
      await service.post(tenantId, entryId, auditContext as any);

      expect(journalEntriesRepository.update).toHaveBeenCalledWith(
        entryId,
        expect.objectContaining({ periodId: 'period-001' }),
        expect.any(Object),
      );
    });

    it('should not reassign entry number on post (assigned on create)', async () => {
      await service.post(tenantId, entryId, auditContext as any);

      // Entry number is assigned during create, not during post
      expect(journalEntriesRepository.update).toHaveBeenCalledWith(
        entryId,
        expect.not.objectContaining({ entryNumber: expect.anything() }),
        expect.any(Object),
      );
    });

    it('should throw if entry is already posted', async () => {
      journalEntriesRepository.findByIdOrNull.mockResolvedValue({
        id: entryId,
        isPosted: true,
      });

      await expect(service.post(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if entry not found', async () => {
      journalEntriesRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.post(tenantId, entryId, auditContext as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate lines balance during post', async () => {
      journalLinesRepository.findByEntryId.mockResolvedValue([
        { accountId: 'acc-001', debit: 100, credit: 0 },
        { accountId: 'acc-002', debit: 0, credit: 50 },
      ]);

      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount());

      await expect(service.post(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if entry date is before fiscal lock date', async () => {
      journalEntriesRepository.findByIdOrNull.mockResolvedValue({
        id: entryId,
        entryDate: '2026-01-15',
        isPosted: false,
        journalId: 'journal-001',
      });
      unifiedSettings.get.mockResolvedValue('2026-02-28');

      await expect(service.post(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if entry date equals fiscal lock date', async () => {
      journalEntriesRepository.findByIdOrNull.mockResolvedValue({
        id: entryId,
        entryDate: '2026-02-28',
        isPosted: false,
        journalId: 'journal-001',
      });
      unifiedSettings.get.mockResolvedValue('2026-02-28');

      await expect(service.post(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if fiscal period is closed', async () => {
      fiscalPeriodsService.resolvePeriod.mockRejectedValue(
        new BadRequestException('Period is closed'),
      );

      await expect(service.post(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── reverse ─────────────────────────────────────────────────────────────

  describe('reverse()', () => {
    beforeEach(() => {
      journalEntriesRepository.findByIdWithLines.mockResolvedValue({
        id: entryId,
        entryNumber: 'JV-0001',
        entryDate: '2026-03-15',
        isPosted: true,
        isReversed: false,
        reversedBy: null,
        journalId: 'journal-001',
        lines: [
          {
            accountId: 'acc-001',
            debit: 100,
            credit: 0,
            partnerId: null,
            costCenterId: null,
            description: null,
            currency: 'SAR',
            currencyId: null,
            amountCurrency: null,
            exchangeRate: 1,
          },
          {
            accountId: 'acc-002',
            debit: 0,
            credit: 100,
            partnerId: null,
            costCenterId: null,
            description: null,
            currency: 'SAR',
            currencyId: null,
            amountCurrency: null,
            exchangeRate: 1,
          },
        ],
      });
      journalEntriesRepository.create.mockResolvedValue({ id: 'reversal-001' });
    });

    it('should create a reversal entry with swapped DR/CR', async () => {
      await service.reverse(tenantId, entryId, auditContext as any);

      expect(journalLinesRepository.bulkInsertLines).toHaveBeenCalledWith(
        'reversal-001',
        expect.arrayContaining([
          expect.objectContaining({ accountId: 'acc-001', debit: 0, credit: 100 }),
          expect.objectContaining({ accountId: 'acc-002', debit: 100, credit: 0 }),
        ]),
        mockTransaction,
      );
    });

    it('should mark reversal as posted immediately', async () => {
      await service.reverse(tenantId, entryId, auditContext as any);

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isPosted: true,
          entryType: JournalEntryType.REVERSAL,
          entryTypeNew: JournalEntryTypeNew.REVERSAL,
        }),
        expect.any(Object),
      );
    });

    it('should link reversalOf to original entry', async () => {
      await service.reverse(tenantId, entryId, auditContext as any);

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ reversalOf: entryId }),
        expect.any(Object),
      );
    });

    it('should mark original entry as reversed', async () => {
      await service.reverse(tenantId, entryId, auditContext as any);

      expect(journalEntriesRepository.update).toHaveBeenCalledWith(
        entryId,
        expect.objectContaining({ isReversed: true, reversedBy: 'reversal-001' }),
        expect.any(Object),
      );
    });

    it('should throw if original entry is not posted', async () => {
      journalEntriesRepository.findByIdWithLines.mockResolvedValue({
        id: entryId,
        isPosted: false,
        isReversed: false,
      });

      await expect(service.reverse(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if original entry is already reversed', async () => {
      journalEntriesRepository.findByIdWithLines.mockResolvedValue({
        id: entryId,
        isPosted: true,
        isReversed: true,
        reversedBy: null,
      });

      await expect(service.reverse(tenantId, entryId, auditContext as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw if original entry has reversedBy set', async () => {
      journalEntriesRepository.findByIdWithLines.mockResolvedValue({
        id: entryId,
        isPosted: true,
        isReversed: false,
        reversedBy: 'some-other-entry',
      });

      await expect(service.reverse(tenantId, entryId, auditContext as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw if entry not found', async () => {
      journalEntriesRepository.findByIdWithLines.mockResolvedValue(null);

      await expect(service.reverse(tenantId, entryId, auditContext as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate fiscal lock date on reversal', async () => {
      unifiedSettings.get.mockResolvedValue('2026-03-31');

      await expect(service.reverse(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft delete a draft entry', async () => {
      journalEntriesRepository.findByIdOrNull.mockResolvedValue({
        id: entryId,
        isPosted: false,
      });

      await service.remove(tenantId, entryId, auditContext as any);

      expect(journalEntriesRepository.softDelete).toHaveBeenCalledWith(entryId, expect.any(Object));
    });

    it('should throw if trying to delete a posted entry', async () => {
      journalEntriesRepository.findByIdOrNull.mockResolvedValue({
        id: entryId,
        isPosted: true,
      });

      await expect(service.remove(tenantId, entryId, auditContext as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if entry not found', async () => {
      journalEntriesRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, entryId, auditContext as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return entry with lines', async () => {
      const result = await service.findById(tenantId, entryId);
      expect(journalEntriesRepository.findByIdWithLines).toHaveBeenCalledWith(tenantId, entryId);
      expect(result).toBeDefined();
    });

    it('should throw if not found', async () => {
      journalEntriesRepository.findByIdWithLines.mockResolvedValue(null);

      await expect(service.findById(tenantId, entryId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Double-entry validation edge cases ──────────────────────────────────

  describe('validateLines — double-entry edge cases', () => {
    it('should accept lines balanced within 0.01 tolerance', async () => {
      const lines = [
        { accountId: 'acc-001', debit: 33.33, credit: 0 },
        { accountId: 'acc-002', debit: 33.33, credit: 0 },
        { accountId: 'acc-003', debit: 33.34, credit: 0 },
        { accountId: 'acc-004', debit: 0, credit: 100 },
      ];

      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount());

      await expect(
        service.create(tenantId, { entryDate: '2026-03-15', lines } as any, auditContext as any),
      ).resolves.toBeDefined();
    });

    it('should reject lines unbalanced beyond 0.01 tolerance', async () => {
      const lines = [
        { accountId: 'acc-001', debit: 100, credit: 0 },
        { accountId: 'acc-002', debit: 0, credit: 99.98 },
      ];

      coaRepository.findByIdOrNull.mockResolvedValue(activeAccount());

      await expect(
        service.create(tenantId, { entryDate: '2026-03-15', lines } as any, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
