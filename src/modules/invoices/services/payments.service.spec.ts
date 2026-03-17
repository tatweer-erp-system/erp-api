// Mock uuid before any imports that depend on it (BaseEntity uses uuid)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

// Mock repository modules to avoid entity import issues
jest.mock('@/database/sql/repositories/payments-new.repository', () => ({
  PaymentsNewRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/treasury-transactions.repository', () => ({
  TreasuryTransactionsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/treasury-accounts.repository', () => ({
  TreasuryAccountsRepository: jest.fn(),
}));

// Mock CLS for msg() helper
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsNewRepository } from '@/database/sql/repositories/payments-new.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { PaymentStatusNew, PaymentTypeNew } from '@/common/enums/invoice.enums';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockPaymentsRepo = {
    findAll: jest.fn(),
    findByIdOrNull: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createTransaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  const mockTreasuryTransactionsRepo = {
    create: jest.fn(),
  };

  const mockTreasuryAccountsRepo = {
    findOne: jest.fn(),
    rawQuery: jest.fn(),
  };

  const mockSequencesService = {
    nextNumber: jest.fn(),
  };

  const mockStatusTransitionService = {
    registerTransitions: jest.fn(),
    validateOrThrow: jest.fn(),
  };

  const mockJournalPosterService = {
    post: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logStatusChange: jest.fn(),
  };

  const mockOutboxService = {
    createEvent: jest.fn(),
  };

  const mockUnifiedSettings = {
    get: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
    mockPaymentsRepo.createTransaction.mockResolvedValue(mockTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsNewRepository, useValue: mockPaymentsRepo },
        { provide: TreasuryTransactionsRepository, useValue: mockTreasuryTransactionsRepo },
        { provide: TreasuryAccountsRepository, useValue: mockTreasuryAccountsRepo },
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: StatusTransitionSharedService, useValue: mockStatusTransitionService },
        { provide: JournalPosterSharedService, useValue: mockJournalPosterService },
        { provide: AuditSharedService, useValue: mockAuditService },
        { provide: OutboxSharedService, useValue: mockOutboxService },
        { provide: UnifiedSettingsService, useValue: mockUnifiedSettings },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call repository with default sorting', async () => {
      mockPaymentsRepo.findAll.mockResolvedValue({ data: [], meta: {} });

      await service.findAll(tenantId, {} as any);

      expect(mockPaymentsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          sortBy: 'paymentDate',
          sortOrder: 'DESC',
          searchFields: ['paymentNumber', 'memo'],
        }),
      );
    });

    it('should pass pagination params', async () => {
      mockPaymentsRepo.findAll.mockResolvedValue({ data: [], meta: {} });

      await service.findAll(tenantId, { page: 2, limit: 10 } as any);

      expect(mockPaymentsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return payment when found', async () => {
      const payment = { id: 'pay-1', paymentNumber: 'PAY-001' };
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue(payment);

      const result = await service.findById(tenantId, 'pay-1');

      expect(result).toEqual(payment);
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      branchId: 'b-1',
      partnerId: 'p-1',
      paymentType: PaymentTypeNew.INBOUND,
      paymentDate: '2026-03-17',
      amount: 1000,
    };

    beforeEach(() => {
      mockSequencesService.nextNumber.mockResolvedValue('PAY-00001');
      mockPaymentsRepo.create.mockResolvedValue({
        id: 'pay-new',
        paymentNumber: 'PAY-00001',
      });
    });

    it('should generate payment number via SequencesService', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockSequencesService.nextNumber).toHaveBeenCalledWith(tenantId, 'payment', 'b-1');
    });

    it('should create payment with DRAFT status', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPaymentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatusNew.DRAFT }),
        expect.any(Object),
      );
    });

    it('should default exchangeRate to 1', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPaymentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ exchangeRate: 1, amountBase: 1000 }),
        expect.any(Object),
      );
    });

    it('should calculate amountBase with custom exchangeRate', async () => {
      await service.create(tenantId, { ...baseDto, exchangeRate: 3.75 }, auditContext);

      expect(mockPaymentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          exchangeRate: 3.75,
          amountBase: 3750,
        }),
        expect.any(Object),
      );
    });

    it('should set optional fields to null when not provided', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPaymentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currencyId: null,
          memo: null,
          journalId: null,
          treasuryAccountId: null,
        }),
        expect.any(Object),
      );
    });

    it('should call audit service logCreate', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'payment',
        'pay-new',
        expect.objectContaining({
          paymentNumber: 'PAY-00001',
          paymentType: PaymentTypeNew.INBOUND,
          amount: 1000,
        }),
        auditContext.userId,
      );
    });

    it('should commit transaction on success', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      mockSequencesService.nextNumber.mockRejectedValue(new Error('seq error'));

      await expect(service.create(tenantId, baseDto, auditContext)).rejects.toThrow('seq error');

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should not commit/rollback when containerTransaction is provided', async () => {
      const containerTx = { commit: jest.fn(), rollback: jest.fn() };
      mockPaymentsRepo.createTransaction.mockResolvedValue(containerTx);

      await service.create(tenantId, baseDto, auditContext, containerTx as any);

      expect(containerTx.commit).not.toHaveBeenCalled();
      expect(containerTx.rollback).not.toHaveBeenCalled();
    });
  });

  // ── post ───────────────────────────────────────────────────────────────────

  describe('post', () => {
    const draftPayment = {
      id: 'pay-1',
      status: PaymentStatusNew.DRAFT,
      paymentType: PaymentTypeNew.INBOUND,
      paymentNumber: 'PAY-001',
      paymentDate: '2026-03-17',
      amount: '500',
      partnerId: 'p-1',
      treasuryAccountId: null,
      memo: 'Test payment',
    };

    beforeEach(() => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue(draftPayment);
      mockUnifiedSettings.get.mockImplementation((_tid: string, key: string) => {
        const map: Record<string, string> = {
          coaCash: 'acc-cash',
          coaAccountsReceivable: 'acc-recv',
          coaAccountsPayable: 'acc-pay',
        };
        return Promise.resolve(map[key] || null);
      });
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValueOnce(null);

      await expect(service.post(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate status transition', async () => {
      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockStatusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'payment_new',
        PaymentStatusNew.DRAFT,
        PaymentStatusNew.POSTED,
      );
    });

    it('should create journal entry for inbound: DR Cash, CR Receivable', async () => {
      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          description: 'Payment PAY-001',
          referenceId: 'pay-1',
          referenceType: 'payment',
          lines: [
            expect.objectContaining({ accountId: 'acc-cash', debit: 500, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-recv', debit: 0, credit: 500 }),
          ],
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should create journal entry for outbound: DR Payable, CR Cash', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue({
        ...draftPayment,
        paymentType: PaymentTypeNew.OUTBOUND,
      });

      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: [
            expect.objectContaining({ accountId: 'acc-pay', debit: 500, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-cash', debit: 0, credit: 500 }),
          ],
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should update status to POSTED', async () => {
      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockPaymentsRepo.update).toHaveBeenCalledWith(
        'pay-1',
        expect.objectContaining({ status: PaymentStatusNew.POSTED }),
        expect.any(Object),
      );
    });

    it('should emit PAYMENT_RECEIVED outbox event', async () => {
      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockOutboxService.createEvent).toHaveBeenCalledWith(
        mockTransaction,
        tenantId,
        'PAYMENT_RECEIVED',
        expect.objectContaining({
          paymentId: 'pay-1',
          paymentNumber: 'PAY-001',
          paymentType: PaymentTypeNew.INBOUND,
          amount: 500,
          partnerId: 'p-1',
          paymentDate: '2026-03-17',
        }),
        'pay-1',
        'payment',
      );
    });

    it('should call audit service logStatusChange', async () => {
      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockAuditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'payment',
        'pay-1',
        PaymentStatusNew.DRAFT,
        PaymentStatusNew.POSTED,
        auditContext.userId,
      );
    });

    it('should create treasury transaction when treasuryAccountId is set', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue({
        ...draftPayment,
        treasuryAccountId: 'treasury-1',
      });
      mockTreasuryAccountsRepo.findOne.mockResolvedValue({
        id: 'treasury-1',
        currency: 'SAR',
        currentBalance: 10000,
      });

      await service.post(tenantId, 'pay-1', auditContext);

      // Should update treasury balance
      expect(mockTreasuryAccountsRepo.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('"currentBalance" = "currentBalance" +'),
        expect.objectContaining({ amount: 500, accountId: 'treasury-1' }),
        mockTransaction,
      );

      // Should create treasury transaction record
      expect(mockTreasuryTransactionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'treasury-1',
          type: 'receipt',
          amount: 500,
        }),
        expect.any(Object),
      );
    });

    it('should NOT create treasury transaction when treasuryAccountId is null', async () => {
      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockTreasuryAccountsRepo.findOne).not.toHaveBeenCalled();
      expect(mockTreasuryTransactionsRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for outbound payment with insufficient treasury balance', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue({
        ...draftPayment,
        paymentType: PaymentTypeNew.OUTBOUND,
        treasuryAccountId: 'treasury-1',
      });
      mockTreasuryAccountsRepo.findOne.mockResolvedValue({
        id: 'treasury-1',
        currency: 'SAR',
        currentBalance: 100, // Less than 500
      });

      await expect(service.post(tenantId, 'pay-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when treasury account not found', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue({
        ...draftPayment,
        treasuryAccountId: 'treasury-missing',
      });
      mockTreasuryAccountsRepo.findOne.mockResolvedValue(null);

      await expect(service.post(tenantId, 'pay-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should commit transaction on success', async () => {
      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      mockJournalPosterService.post.mockRejectedValue(new Error('journal error'));

      await expect(service.post(tenantId, 'pay-1', auditContext)).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when accounting setting is missing', async () => {
      mockJournalPosterService.post.mockResolvedValue(undefined);
      mockUnifiedSettings.get.mockResolvedValue(null);

      await expect(service.post(tenantId, 'pay-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use - operator for outbound treasury balance update', async () => {
      mockJournalPosterService.post.mockResolvedValue(undefined);
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue({
        ...draftPayment,
        paymentType: PaymentTypeNew.OUTBOUND,
        amount: '100',
        treasuryAccountId: 'treasury-1',
      });
      mockTreasuryAccountsRepo.findOne.mockResolvedValue({
        id: 'treasury-1',
        currency: 'SAR',
        currentBalance: 500,
      });

      await service.post(tenantId, 'pay-1', auditContext);

      expect(mockTreasuryAccountsRepo.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('"currentBalance" = "currentBalance" -'),
        expect.any(Object),
        mockTransaction,
      );
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    const draftPayment = {
      id: 'pay-1',
      status: PaymentStatusNew.DRAFT,
    };

    beforeEach(() => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue(draftPayment);
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValueOnce(null);

      await expect(service.cancel(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate status transition', async () => {
      await service.cancel(tenantId, 'pay-1', auditContext);

      expect(mockStatusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'payment_new',
        PaymentStatusNew.DRAFT,
        PaymentStatusNew.CANCELLED,
      );
    });

    it('should update status to CANCELLED', async () => {
      await service.cancel(tenantId, 'pay-1', auditContext);

      expect(mockPaymentsRepo.update).toHaveBeenCalledWith(
        'pay-1',
        expect.objectContaining({ status: PaymentStatusNew.CANCELLED }),
        expect.any(Object),
      );
    });

    it('should call audit service logStatusChange', async () => {
      await service.cancel(tenantId, 'pay-1', auditContext);

      expect(mockAuditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'payment',
        'pay-1',
        PaymentStatusNew.DRAFT,
        PaymentStatusNew.CANCELLED,
        auditContext.userId,
      );
    });

    it('should also allow cancelling posted payments', async () => {
      mockPaymentsRepo.findByIdOrNull.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatusNew.POSTED,
      });

      await service.cancel(tenantId, 'pay-1', auditContext);

      expect(mockStatusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'payment_new',
        PaymentStatusNew.POSTED,
        PaymentStatusNew.CANCELLED,
      );
    });

    it('should commit transaction on success', async () => {
      await service.cancel(tenantId, 'pay-1', auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      mockPaymentsRepo.update.mockRejectedValue(new Error('db error'));

      await expect(service.cancel(tenantId, 'pay-1', auditContext)).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should not commit/rollback when containerTransaction is provided', async () => {
      mockPaymentsRepo.update.mockResolvedValue(undefined);
      const containerTx = { commit: jest.fn(), rollback: jest.fn() };
      mockPaymentsRepo.createTransaction.mockResolvedValue(containerTx);

      await service.cancel(tenantId, 'pay-1', auditContext, containerTx as any);

      expect(containerTx.commit).not.toHaveBeenCalled();
      expect(containerTx.rollback).not.toHaveBeenCalled();
    });
  });
});
