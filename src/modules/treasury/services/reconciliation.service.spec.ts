jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationStatus } from '@/common/enums/accounting.enums';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let accountsRepository: Record<string, jest.Mock>;
  let transactionsRepository: Record<string, jest.Mock>;
  let reconciliationsRepository: Record<string, jest.Mock>;
  let statementsRepository: Record<string, jest.Mock>;
  let statementLinesRepository: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };
  const reconciliationId = 'recon-001';

  const inProgressRecon = (overrides: Record<string, unknown> = {}) => ({
    id: reconciliationId,
    accountId: 'tacc-001',
    statementDate: '2026-03-31',
    openingBalance: 0,
    closingBalance: 5000,
    systemBalance: 5000,
    difference: 0,
    status: ReconciliationStatus.IN_PROGRESS,
    ...overrides,
  });

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    accountsRepository = {
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      findOne: jest.fn().mockResolvedValue({
        id: 'tacc-001',
        currency: 'SAR',
        currentBalance: '5000',
      }),
    };

    transactionsRepository = {
      rawQuery: jest.fn().mockResolvedValue([{ systemBalance: '5000' }]),
      findAllRaw: jest.fn().mockResolvedValue([]),
      bulkUpdate: jest.fn().mockResolvedValue(undefined),
    };

    reconciliationsRepository = {
      create: jest
        .fn()
        .mockImplementation((data) => Promise.resolve({ id: reconciliationId, ...data })),
      rawQuery: jest.fn().mockResolvedValue([inProgressRecon()]),
      update: jest
        .fn()
        .mockResolvedValue(inProgressRecon({ status: ReconciliationStatus.COMPLETED })),
    };

    statementsRepository = {};

    statementLinesRepository = {
      findAllRaw: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };

    currencyService = {
      getBaseCurrency: jest.fn().mockResolvedValue({ id: 'cur-sar', code: 'SAR' }),
      toBase: jest.fn().mockResolvedValue({ amount: 5000, rate: 1 }),
    };

    service = new ReconciliationService(
      accountsRepository as any,
      transactionsRepository as any,
      reconciliationsRepository as any,
      statementsRepository as any,
      statementLinesRepository as any,
      currencyService as any,
    );
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a reconciliation in IN_PROGRESS status', async () => {
      const result = await service.create(
        tenantId,
        {
          accountId: 'tacc-001',
          statementDate: '2026-03-31',
          openingBalance: 0,
          closingBalance: 5000,
        } as any,
        auditContext as any,
      );

      expect(reconciliationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReconciliationStatus.IN_PROGRESS,
          accountId: 'tacc-001',
        }),
        expect.any(Object),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should calculate difference between closing and system balance', async () => {
      transactionsRepository.rawQuery.mockResolvedValue([{ systemBalance: '4000' }]);

      await service.create(
        tenantId,
        {
          accountId: 'tacc-001',
          statementDate: '2026-03-31',
          openingBalance: 0,
          closingBalance: 5000,
        } as any,
        auditContext as any,
      );

      expect(reconciliationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ difference: 1000 }),
        expect.any(Object),
      );
    });

    it('should throw if account not found', async () => {
      accountsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          tenantId,
          {
            accountId: 'missing',
            statementDate: '2026-03-31',
            openingBalance: 0,
            closingBalance: 5000,
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── matchTransactions ───────────────────────────────────────────────────

  describe('matchTransactions()', () => {
    it('should mark transactions as reconciled', async () => {
      const result = await service.matchTransactions(tenantId, reconciliationId, {
        transactionIds: ['tx-001', 'tx-002'],
      } as any);

      expect(transactionsRepository.bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ['tx-001', 'tx-002'], tenantId },
          data: expect.objectContaining({ isReconciled: true, reconciliationId }),
        }),
      );
      expect(result.matched).toBe(2);
    });

    it('should throw if reconciliation is completed', async () => {
      reconciliationsRepository.rawQuery.mockResolvedValue([
        inProgressRecon({ status: ReconciliationStatus.COMPLETED }),
      ]);

      await expect(
        service.matchTransactions(tenantId, reconciliationId, {
          transactionIds: ['tx-001'],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── unmatchTransactions ─────────────────────────────────────────────────

  describe('unmatchTransactions()', () => {
    it('should mark transactions as unreconciled', async () => {
      const result = await service.unmatchTransactions(tenantId, reconciliationId, {
        transactionIds: ['tx-001'],
      } as any);

      expect(transactionsRepository.bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isReconciled: false, reconciliationId: null }),
        }),
      );
      expect(result.unmatched).toBe(1);
    });

    it('should throw if reconciliation is completed', async () => {
      reconciliationsRepository.rawQuery.mockResolvedValue([
        inProgressRecon({ status: ReconciliationStatus.COMPLETED }),
      ]);

      await expect(
        service.unmatchTransactions(tenantId, reconciliationId, {
          transactionIds: ['tx-001'],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── complete ────────────────────────────────────────────────────────────

  describe('complete()', () => {
    it('should complete a reconciliation with zero difference', async () => {
      reconciliationsRepository.rawQuery.mockResolvedValue([inProgressRecon({ difference: 0 })]);

      await service.complete(tenantId, reconciliationId, auditContext as any);

      expect(reconciliationsRepository.update).toHaveBeenCalledWith(
        reconciliationId,
        expect.objectContaining({
          status: ReconciliationStatus.COMPLETED,
          reconciledBy: 'user-001',
          completedAt: expect.any(Date),
        }),
        expect.any(Object),
      );
    });

    it('should throw if difference is not zero', async () => {
      reconciliationsRepository.rawQuery.mockResolvedValue([inProgressRecon({ difference: 150 })]);

      await expect(
        service.complete(tenantId, reconciliationId, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if already completed', async () => {
      reconciliationsRepository.rawQuery.mockResolvedValue([
        inProgressRecon({ status: ReconciliationStatus.COMPLETED }),
      ]);

      await expect(
        service.complete(tenantId, reconciliationId, auditContext as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── autoMatchForReconciliation ──────────────────────────────────────────

  describe('autoMatchForReconciliation()', () => {
    it('should match statement lines against treasury transactions', async () => {
      statementLinesRepository.findAllRaw.mockResolvedValue([
        { id: 'line-001', amount: '100.00', date: '2026-03-15', isReconciled: false },
        { id: 'line-002', amount: '-50.00', date: '2026-03-16', isReconciled: false },
      ]);

      // First call matches, second does not
      transactionsRepository.rawQuery
        .mockResolvedValueOnce([{ id: 'tx-match', paymentId: null, journalEntryId: null }])
        .mockResolvedValueOnce([]);

      const result = await service.autoMatchForReconciliation(
        tenantId,
        reconciliationId,
        'stmt-001',
        auditContext as any,
      );

      expect(result.totalLines).toBe(2);
      expect(result.matched).toBe(1);
      expect(result.unmatched).toBe(1);
    });

    it('should mark matched treasury transaction as reconciled', async () => {
      statementLinesRepository.findAllRaw.mockResolvedValue([
        { id: 'line-001', amount: '100.00', date: '2026-03-15', isReconciled: false },
      ]);

      transactionsRepository.rawQuery.mockResolvedValueOnce([
        { id: 'tx-match', paymentId: 'pay-001', journalEntryId: 'je-001' },
      ]);

      await service.autoMatchForReconciliation(
        tenantId,
        reconciliationId,
        'stmt-001',
        auditContext as any,
      );

      expect(transactionsRepository.bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ['tx-match'], tenantId },
          data: expect.objectContaining({ isReconciled: true }),
        }),
      );
    });

    it('should update statement line with paymentId and journalEntryId', async () => {
      statementLinesRepository.findAllRaw.mockResolvedValue([
        { id: 'line-001', amount: '200.00', date: '2026-03-15', isReconciled: false },
      ]);

      transactionsRepository.rawQuery.mockResolvedValueOnce([
        { id: 'tx-match', paymentId: 'pay-001', journalEntryId: 'je-001' },
      ]);

      await service.autoMatchForReconciliation(
        tenantId,
        reconciliationId,
        'stmt-001',
        auditContext as any,
      );

      expect(statementLinesRepository.update).toHaveBeenCalledWith(
        'line-001',
        expect.objectContaining({
          isReconciled: true,
          paymentId: 'pay-001',
          journalEntryId: 'je-001',
        }),
        expect.any(Object),
      );
    });

    it('should return all unmatched when no treasury transactions match', async () => {
      statementLinesRepository.findAllRaw.mockResolvedValue([
        { id: 'line-001', amount: '100.00', date: '2026-03-15', isReconciled: false },
        { id: 'line-002', amount: '200.00', date: '2026-03-16', isReconciled: false },
      ]);

      transactionsRepository.rawQuery.mockResolvedValue([]);

      const result = await service.autoMatchForReconciliation(
        tenantId,
        reconciliationId,
        'stmt-001',
        auditContext as any,
      );

      expect(result.matched).toBe(0);
      expect(result.unmatched).toBe(2);
    });

    it('should throw if reconciliation is already completed', async () => {
      reconciliationsRepository.rawQuery.mockResolvedValue([
        inProgressRecon({ status: ReconciliationStatus.COMPLETED }),
      ]);

      await expect(
        service.autoMatchForReconciliation(
          tenantId,
          reconciliationId,
          'stmt-001',
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle zero unreconciled lines gracefully', async () => {
      statementLinesRepository.findAllRaw.mockResolvedValue([]);

      const result = await service.autoMatchForReconciliation(
        tenantId,
        reconciliationId,
        'stmt-001',
        auditContext as any,
      );

      expect(result.totalLines).toBe(0);
      expect(result.matched).toBe(0);
      expect(result.unmatched).toBe(0);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return reconciliation', async () => {
      const result = await service.findById(tenantId, reconciliationId);
      expect(result).toBeDefined();
    });

    it('should throw if not found', async () => {
      reconciliationsRepository.rawQuery.mockResolvedValue([]);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(BadRequestException);
    });
  });

  // ── getUnmatched ────────────────────────────────────────────────────────

  describe('getUnmatched()', () => {
    it('should return unreconciled transactions for the account', async () => {
      transactionsRepository.findAllRaw.mockResolvedValue([{ id: 'tx-001', isReconciled: false }]);

      const result = await service.getUnmatched(tenantId, reconciliationId);

      expect(transactionsRepository.findAllRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: 'tacc-001', isReconciled: false },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
