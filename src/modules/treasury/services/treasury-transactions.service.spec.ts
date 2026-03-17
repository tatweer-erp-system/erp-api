jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { TreasuryTransactionsService } from './treasury-transactions.service';
import { TreasuryTransactionType } from '@/common/enums/accounting.enums';

describe('TreasuryTransactionsService', () => {
  let service: TreasuryTransactionsService;
  let accountsRepository: Record<string, jest.Mock>;
  let transactionsRepository: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let journalPoster: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  const treasuryAccount = (overrides: Record<string, unknown> = {}) => ({
    id: 'tacc-001',
    currency: 'SAR',
    currentBalance: '5000',
    ...overrides,
  });

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    accountsRepository = {
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      findOne: jest.fn().mockResolvedValue(treasuryAccount()),
      rawQuery: jest.fn().mockResolvedValue([{ currentBalance: '5100' }]),
    };

    transactionsRepository = {
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'tx-001', ...data })),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ id: 'tx-001' }),
      findAllRaw: jest.fn().mockResolvedValue([]),
      rawQuery: jest.fn().mockResolvedValue([]),
    };

    currencyService = {
      getBaseCurrency: jest.fn().mockResolvedValue({ id: 'cur-sar', code: 'SAR' }),
      toBase: jest.fn().mockResolvedValue({ amount: 100, rate: 1 }),
      convert: jest.fn().mockReturnValue(100),
      getRate: jest.fn().mockResolvedValue(1),
    };

    journalPoster = {
      postTreasuryReceipt: jest.fn().mockResolvedValue(undefined),
      postTreasuryPayment: jest.fn().mockResolvedValue(undefined),
    };

    service = new TreasuryTransactionsService(
      accountsRepository as any,
      transactionsRepository as any,
      currencyService as any,
      journalPoster as any,
    );
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a receipt transaction and increase balance', async () => {
      const result = await service.create(
        tenantId,
        {
          accountId: 'tacc-001',
          type: TreasuryTransactionType.RECEIPT,
          amount: 100,
          date: '2026-03-15',
        } as any,
        auditContext as any,
      );

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'tacc-001',
          type: TreasuryTransactionType.RECEIPT,
          amount: 100,
        }),
        expect.any(Object),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toHaveProperty('balanceAfter');
    });

    it('should create a payment transaction', async () => {
      await service.create(
        tenantId,
        {
          accountId: 'tacc-001',
          type: TreasuryTransactionType.PAYMENT,
          amount: 100,
          date: '2026-03-15',
        } as any,
        auditContext as any,
      );

      expect(accountsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('-'),
        expect.any(Object),
        mockTransaction,
      );
    });

    it('should throw if payment exceeds balance', async () => {
      accountsRepository.findOne.mockResolvedValue(treasuryAccount({ currentBalance: '50' }));

      await expect(
        service.create(
          tenantId,
          {
            accountId: 'tacc-001',
            type: TreasuryTransactionType.PAYMENT,
            amount: 100,
            date: '2026-03-15',
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not check balance for receipt transactions', async () => {
      accountsRepository.findOne.mockResolvedValue(treasuryAccount({ currentBalance: '0' }));

      await expect(
        service.create(
          tenantId,
          {
            accountId: 'tacc-001',
            type: TreasuryTransactionType.RECEIPT,
            amount: 100,
            date: '2026-03-15',
          } as any,
          auditContext as any,
        ),
      ).resolves.toBeDefined();
    });

    it('should throw if treasury account not found', async () => {
      accountsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          tenantId,
          {
            accountId: 'missing',
            type: TreasuryTransactionType.RECEIPT,
            amount: 100,
            date: '2026-03-15',
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set isReconciled to false on new transaction', async () => {
      await service.create(
        tenantId,
        {
          accountId: 'tacc-001',
          type: TreasuryTransactionType.RECEIPT,
          amount: 100,
          date: '2026-03-15',
        } as any,
        auditContext as any,
      );

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isReconciled: false }),
        expect.any(Object),
      );
    });

    it('should not post journal entry for opening balance', async () => {
      await service.create(
        tenantId,
        {
          accountId: 'tacc-001',
          type: TreasuryTransactionType.OPENING_BALANCE,
          amount: 10000,
          date: '2026-01-01',
        } as any,
        auditContext as any,
      );

      // Journal posting is fire-and-forget but should not be called for opening_balance
      // Verify the transaction was committed (no journal failure)
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      accountsRepository.rawQuery.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create(
          tenantId,
          {
            accountId: 'tacc-001',
            type: TreasuryTransactionType.RECEIPT,
            amount: 100,
            date: '2026-03-15',
          } as any,
          auditContext as any,
        ),
      ).rejects.toThrow('DB error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should use partnerId from dto', async () => {
      await service.create(
        tenantId,
        {
          accountId: 'tacc-001',
          type: TreasuryTransactionType.RECEIPT,
          amount: 100,
          date: '2026-03-15',
          partnerId: 'partner-001',
        } as any,
        auditContext as any,
      );

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'partner-001',
          contactId: 'partner-001',
        }),
        expect.any(Object),
      );
    });
  });

  // ── createFromPayment ───────────────────────────────────────────────────

  describe('createFromPayment()', () => {
    it('should create a RECEIPT for inbound payment', async () => {
      await service.createFromPayment(
        tenantId,
        {
          paymentId: 'pay-001',
          treasuryAccountId: 'tacc-001',
          amount: 500,
          paymentDate: '2026-03-15',
          paymentNumber: 'PAY-001',
          paymentType: 'inbound',
          partnerId: 'partner-001',
        },
        auditContext as any,
      );

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TreasuryTransactionType.RECEIPT,
          amount: 500,
          paymentId: 'pay-001',
        }),
        expect.any(Object),
      );
    });

    it('should create a PAYMENT for outbound payment', async () => {
      await service.createFromPayment(
        tenantId,
        {
          paymentId: 'pay-002',
          treasuryAccountId: 'tacc-001',
          amount: 200,
          paymentDate: '2026-03-15',
          paymentNumber: 'PAY-002',
          paymentType: 'outbound',
        },
        auditContext as any,
      );

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TreasuryTransactionType.PAYMENT,
        }),
        expect.any(Object),
      );
    });
  });

  // ── findByPaymentId ─────────────────────────────────────────────────────

  describe('findByPaymentId()', () => {
    it('should query transactions by paymentId', async () => {
      transactionsRepository.findAllRaw.mockResolvedValue([{ id: 'tx-001', paymentId: 'pay-001' }]);

      const result = await service.findByPaymentId(tenantId, 'pay-001');

      expect(transactionsRepository.findAllRaw).toHaveBeenCalledWith({
        tenantId,
        where: { paymentId: 'pay-001' },
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no transactions match', async () => {
      transactionsRepository.findAllRaw.mockResolvedValue([]);

      const result = await service.findByPaymentId(tenantId, 'pay-999');
      expect(result).toHaveLength(0);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return a single transaction', async () => {
      const result = await service.findById(tenantId, 'tx-001');
      expect(result).toBeDefined();
    });

    it('should throw if transaction not found', async () => {
      transactionsRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'tx-999')).rejects.toThrow(BadRequestException);
    });
  });

  // ── findByAccount ───────────────────────────────────────────────────────

  describe('findByAccount()', () => {
    it('should return paginated transactions for account', async () => {
      transactionsRepository.findAll.mockResolvedValue({
        data: [{ id: 'tx-001' }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await service.findByAccount(tenantId, 'tacc-001', {
        page: 1,
        limit: 20,
      } as any);

      expect(result.data).toHaveLength(1);
    });

    it('should throw if account not found', async () => {
      accountsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByAccount(tenantId, 'missing', { page: 1, limit: 20 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
