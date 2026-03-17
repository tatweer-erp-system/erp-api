jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/bank-statements.repository', () => ({
  BankStatementsRepository: jest.fn(),
}));

jest.mock('@/database/sql/repositories/bank-statement-lines.repository', () => ({
  BankStatementLinesRepository: jest.fn(),
}));

jest.mock('@/database/sql/repositories/treasury-transactions.repository', () => ({
  TreasuryTransactionsRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BankStatementsService } from './bank-statements.service';
import { BankStatementsRepository } from '@/database/sql/repositories/bank-statements.repository';
import { BankStatementLinesRepository } from '@/database/sql/repositories/bank-statement-lines.repository';
import { TreasuryTransactionsRepository } from '@/database/sql/repositories/treasury-transactions.repository';
import { BankStatementStatus } from '@/common/enums/bank-statement.enums';

describe('BankStatementsService', () => {
  let service: BankStatementsService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockStatementsRepo = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createTransaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  const mockLinesRepo = {
    findAll: jest.fn(),
    findAllRaw: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    bulkCreate: jest.fn(),
  };

  const mockTreasuryRepo = {
    rawQuery: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockStatementsRepo.createTransaction.mockResolvedValue(mockTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankStatementsService,
        { provide: BankStatementsRepository, useValue: mockStatementsRepo },
        { provide: BankStatementLinesRepository, useValue: mockLinesRepo },
        { provide: TreasuryTransactionsRepository, useValue: mockTreasuryRepo },
      ],
    }).compile();

    service = module.get<BankStatementsService>(BankStatementsService);
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      branchId: 'branch-1',
      name: 'March 2026',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      balanceStart: 10000,
      balanceEnd: 15000,
    };

    it('should create a bank statement with status OPEN', async () => {
      const created = { id: 'bs1', ...dto, status: BankStatementStatus.OPEN };
      mockStatementsRepo.create.mockResolvedValue(created);

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(mockStatementsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'branch-1',
          name: 'March 2026',
          balanceStart: 10000,
          balanceEnd: 15000,
          balanceEndReal: null,
          status: BankStatementStatus.OPEN,
        }),
        expect.objectContaining({ tenantId, auditContext }),
      );
      expect(result).toEqual(created);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback on creation error', async () => {
      mockStatementsRepo.create.mockRejectedValue(new Error('DB fail'));

      await expect(service.create(tenantId, dto as any, auditContext)).rejects.toThrow('DB fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should not commit when containerTransaction is provided', async () => {
      const externalTx = { commit: jest.fn(), rollback: jest.fn() };
      mockStatementsRepo.createTransaction.mockResolvedValue(externalTx);
      mockStatementsRepo.create.mockResolvedValue({ id: 'bs2' });

      await service.create(tenantId, dto as any, auditContext, externalTx as any);

      expect(externalTx.commit).not.toHaveBeenCalled();
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated statements', async () => {
      const expected = { data: [{ id: 'bs1' }], meta: { total: 1 } };
      mockStatementsRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll(tenantId, {} as any);

      expect(result).toEqual(expected);
    });

    it('should filter by branchId and status', async () => {
      mockStatementsRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, {
        branchId: 'branch-1',
        status: BankStatementStatus.OPEN,
      } as any);

      expect(mockStatementsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { branchId: 'branch-1', status: BankStatementStatus.OPEN },
        }),
      );
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return statement when found', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({ id: 'bs1', name: 'March' });

      const result = await service.findById(tenantId, 'bs1');

      expect(result).toEqual({ id: 'bs1', name: 'March' });
    });

    it('should throw NotFoundException when statement not found', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update an open statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.OPEN,
      });
      mockStatementsRepo.update.mockResolvedValue({ id: 'bs1', name: 'Updated' });

      const result = await service.update(
        tenantId,
        'bs1',
        { name: 'Updated' } as any,
        auditContext,
      );

      expect(result.name).toBe('Updated');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when modifying a posted statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.POSTED,
      });

      await expect(
        service.update(tenantId, 'bs1', { name: 'X' } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw NotFoundException when statement not found', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { name: 'X' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete an open statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.OPEN,
      });

      await service.remove(tenantId, 'bs1', auditContext);

      expect(mockStatementsRepo.softDelete).toHaveBeenCalledWith('bs1', {
        tenantId,
        auditContext,
      });
    });

    it('should throw BadRequestException when deleting a posted statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.POSTED,
      });

      await expect(service.remove(tenantId, 'bs1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when statement not found', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── addLine ──────────────────────────────────────────────────────────────

  describe('addLine', () => {
    it('should add a line to an open statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        branchId: 'branch-1',
        status: BankStatementStatus.OPEN,
      });
      mockLinesRepo.create.mockResolvedValue({ id: 'line1', amount: 500 });

      const result = await service.addLine(
        tenantId,
        'bs1',
        { date: '2026-03-15', amount: 500, reference: 'DEP001' } as any,
        auditContext,
      );

      expect(mockLinesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'branch-1',
          statementId: 'bs1',
          date: '2026-03-15',
          amount: 500,
          reference: 'DEP001',
          isReconciled: false,
          journalEntryId: null,
          paymentId: null,
        }),
        expect.any(Object),
      );
      expect(result.id).toBe('line1');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when adding line to posted statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.POSTED,
      });

      await expect(
        service.addLine(tenantId, 'bs1', { date: '2026-03-15', amount: 100 } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── removeLine ───────────────────────────────────────────────────────────

  describe('removeLine', () => {
    it('should delete an unreconciled line', async () => {
      mockLinesRepo.findOne.mockResolvedValue({ id: 'line1', isReconciled: false });

      await service.removeLine(tenantId, 'line1', auditContext);

      expect(mockLinesRepo.softDelete).toHaveBeenCalledWith('line1', { tenantId, auditContext });
    });

    it('should throw BadRequestException when deleting a reconciled line', async () => {
      mockLinesRepo.findOne.mockResolvedValue({ id: 'line1', isReconciled: true });

      await expect(service.removeLine(tenantId, 'line1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when line not found', async () => {
      mockLinesRepo.findOne.mockResolvedValue(null);

      await expect(service.removeLine(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── importLines (CSV) ──────────────────────────────────────────────────

  describe('importLines', () => {
    const openStatement = {
      id: 'bs1',
      branchId: 'branch-1',
      status: BankStatementStatus.OPEN,
    };

    it('should parse CSV and create statement lines', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);

      const csv = [
        'date,reference,partnerName,amount',
        '2026-03-01,DEP001,Customer A,500.00',
        '2026-03-02,WTH001,Vendor B,-200.50',
      ].join('\n');

      const result = await service.importLines(tenantId, 'bs1', csv, auditContext);

      expect(result).toEqual({ imported: 2 });
      expect(mockLinesRepo.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              branchId: 'branch-1',
              statementId: 'bs1',
              date: '2026-03-01',
              reference: 'DEP001',
              partnerName: 'Customer A',
              amount: 500.0,
              isReconciled: false,
            }),
            expect.objectContaining({
              date: '2026-03-02',
              reference: 'WTH001',
              partnerName: 'Vendor B',
              amount: -200.5,
            }),
          ]),
          tenantId,
          auditContext,
        }),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty CSV (header only)', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);

      const csv = 'date,reference,partnerName,amount';

      await expect(service.importLines(tenantId, 'bs1', csv, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip rows with less than 4 columns', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }]);

      const csv = [
        'date,reference,partnerName,amount',
        '2026-03-01,DEP001,Customer A,500',
        '2026-03-02,invalid',
      ].join('\n');

      const result = await service.importLines(tenantId, 'bs1', csv, auditContext);

      expect(result).toEqual({ imported: 1 });
    });

    it('should skip rows with non-numeric amount', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }]);

      const csv = [
        'date,reference,partnerName,amount',
        '2026-03-01,DEP001,Customer A,500',
        '2026-03-02,DEP002,Customer B,not-a-number',
      ].join('\n');

      const result = await service.importLines(tenantId, 'bs1', csv, auditContext);

      expect(result).toEqual({ imported: 1 });
    });

    it('should throw BadRequestException when importing to a posted statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.POSTED,
      });

      await expect(
        service.importLines(
          tenantId,
          'bs1',
          'date,ref,name,amount\n2026-01-01,X,Y,100',
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle quoted CSV values', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }]);

      const csv = [
        'date,reference,partnerName,amount',
        '"2026-03-01","DEP001","Customer A","500.00"',
      ].join('\n');

      await service.importLines(tenantId, 'bs1', csv, auditContext);

      expect(mockLinesRepo.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              date: '2026-03-01',
              reference: 'DEP001',
              partnerName: 'Customer A',
              amount: 500.0,
            }),
          ]),
        }),
      );
    });

    it('should set empty reference/partnerName to null', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }]);

      const csv = ['date,reference,partnerName,amount', '2026-03-01,,,500'].join('\n');

      await service.importLines(tenantId, 'bs1', csv, auditContext);

      expect(mockLinesRepo.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ reference: null, partnerName: null }),
          ]),
        }),
      );
    });
  });

  // ── autoMatch ────────────────────────────────────────────────────────────

  describe('autoMatch', () => {
    const openStatement = {
      id: 'bs1',
      status: BankStatementStatus.OPEN,
    };

    it('should match lines by exact amount with date proximity', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.findAllRaw.mockResolvedValue([
        { id: 'line1', amount: '500', partnerName: 'Customer A', date: '2026-03-15' },
        { id: 'line2', amount: '-200', partnerName: 'Vendor B', date: '2026-03-16' },
      ]);
      // First line matches, second does not
      mockTreasuryRepo.rawQuery
        .mockResolvedValueOnce([{ id: 'tx1', paymentId: 'pay-1', journalEntryId: null }])
        .mockResolvedValueOnce([]);
      mockLinesRepo.update.mockResolvedValue({});

      const result = await service.autoMatch(tenantId, 'bs1', auditContext);

      expect(result).toEqual({ totalLines: 2, matched: 1, unmatched: 1 });
      expect(mockLinesRepo.update).toHaveBeenCalledTimes(1);
      expect(mockLinesRepo.update).toHaveBeenCalledWith(
        'line1',
        expect.objectContaining({ isReconciled: true, paymentId: 'pay-1' }),
        expect.any(Object),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should return zero matches when no treasury transactions match', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.findAllRaw.mockResolvedValue([
        { id: 'line1', amount: '999', partnerName: null, date: '2026-03-15' },
      ]);
      mockTreasuryRepo.rawQuery.mockResolvedValue([]);

      const result = await service.autoMatch(tenantId, 'bs1', auditContext);

      expect(result).toEqual({ totalLines: 1, matched: 0, unmatched: 1 });
    });

    it('should match all lines when all have corresponding transactions', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.findAllRaw.mockResolvedValue([
        { id: 'line1', amount: '500', partnerName: null, date: '2026-03-15' },
        { id: 'line2', amount: '-300', partnerName: null, date: '2026-03-16' },
      ]);
      mockTreasuryRepo.rawQuery
        .mockResolvedValueOnce([{ id: 'tx1', paymentId: 'pay-1', journalEntryId: null }])
        .mockResolvedValueOnce([{ id: 'tx2', paymentId: null, journalEntryId: 'je-1' }]);
      mockLinesRepo.update.mockResolvedValue({});

      const result = await service.autoMatch(tenantId, 'bs1', auditContext);

      expect(result).toEqual({ totalLines: 2, matched: 2, unmatched: 0 });
    });

    it('should throw BadRequestException for posted statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.POSTED,
      });

      await expect(service.autoMatch(tenantId, 'bs1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle empty unreconciled lines', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(openStatement);
      mockLinesRepo.findAllRaw.mockResolvedValue([]);

      const result = await service.autoMatch(tenantId, 'bs1', auditContext);

      expect(result).toEqual({ totalLines: 0, matched: 0, unmatched: 0 });
    });
  });

  // ── matchLine (manual) ──────────────────────────────────────────────────

  describe('matchLine', () => {
    it('should manually match a line to a payment', async () => {
      mockLinesRepo.findOne.mockResolvedValue({ id: 'line1', isReconciled: false });
      mockLinesRepo.update.mockResolvedValue({ id: 'line1', isReconciled: true });

      const result = await service.matchLine(
        tenantId,
        'line1',
        { paymentId: 'pay-1' } as any,
        auditContext,
      );

      expect(mockLinesRepo.update).toHaveBeenCalledWith(
        'line1',
        expect.objectContaining({ isReconciled: true, paymentId: 'pay-1' }),
        expect.any(Object),
      );
      expect(result.isReconciled).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should manually match a line to a journal entry', async () => {
      mockLinesRepo.findOne.mockResolvedValue({ id: 'line1', isReconciled: false });
      mockLinesRepo.update.mockResolvedValue({ id: 'line1', isReconciled: true });

      await service.matchLine(tenantId, 'line1', { journalEntryId: 'je-1' } as any, auditContext);

      expect(mockLinesRepo.update).toHaveBeenCalledWith(
        'line1',
        expect.objectContaining({ isReconciled: true, journalEntryId: 'je-1' }),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when line is already reconciled', async () => {
      mockLinesRepo.findOne.mockResolvedValue({ id: 'line1', isReconciled: true });

      await expect(
        service.matchLine(tenantId, 'line1', { paymentId: 'pay-1' } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when line not found', async () => {
      mockLinesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.matchLine(tenantId, 'missing', { paymentId: 'pay-1' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── unmatchLine ─────────────────────────────────────────────────────────

  describe('unmatchLine', () => {
    it('should unmatch a reconciled line', async () => {
      mockLinesRepo.findOne.mockResolvedValue({
        id: 'line1',
        isReconciled: true,
        paymentId: 'pay-1',
      });
      mockLinesRepo.update.mockResolvedValue({
        id: 'line1',
        isReconciled: false,
        paymentId: null,
        journalEntryId: null,
      });

      const result = await service.unmatchLine(tenantId, 'line1', auditContext);

      expect(mockLinesRepo.update).toHaveBeenCalledWith(
        'line1',
        expect.objectContaining({
          isReconciled: false,
          paymentId: null,
          journalEntryId: null,
        }),
        expect.any(Object),
      );
      expect(result.isReconciled).toBe(false);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when line is not reconciled', async () => {
      mockLinesRepo.findOne.mockResolvedValue({ id: 'line1', isReconciled: false });

      await expect(service.unmatchLine(tenantId, 'line1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when line not found', async () => {
      mockLinesRepo.findOne.mockResolvedValue(null);

      await expect(service.unmatchLine(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── validate ─────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('should validate an open statement and calculate balanceEndReal', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.OPEN,
        balanceStart: 10000,
        balanceEnd: 15000,
      });
      mockLinesRepo.findAllRaw.mockResolvedValue([
        { id: 'l1', amount: 3000, isReconciled: true },
        { id: 'l2', amount: 2000, isReconciled: true },
        { id: 'l3', amount: -500, isReconciled: false },
      ]);
      mockStatementsRepo.update.mockResolvedValue({});

      const result = await service.validate(tenantId, 'bs1', auditContext);

      expect(result).toEqual({
        statementId: 'bs1',
        status: BankStatementStatus.POSTED,
        balanceStart: 10000,
        balanceEnd: 15000,
        balanceEndReal: 14500, // 10000 + 3000 + 2000 - 500
        totalLines: 3,
        reconciledLines: 2,
        unreconciledLines: 1,
      });
      expect(mockStatementsRepo.update).toHaveBeenCalledWith(
        'bs1',
        expect.objectContaining({
          status: BankStatementStatus.POSTED,
          balanceEndReal: 14500,
        }),
        expect.any(Object),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should round balanceEndReal to 2 decimal places', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.OPEN,
        balanceStart: 100,
        balanceEnd: 200,
      });
      mockLinesRepo.findAllRaw.mockResolvedValue([
        { id: 'l1', amount: 33.333, isReconciled: false },
        { id: 'l2', amount: 66.666, isReconciled: false },
      ]);
      mockStatementsRepo.update.mockResolvedValue({});

      const result = await service.validate(tenantId, 'bs1', auditContext);

      // 100 + 33.333 + 66.666 = 199.999 -> rounds to 200
      expect(result.balanceEndReal).toBe(200);
    });

    it('should throw BadRequestException for already posted statement', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.POSTED,
      });

      await expect(service.validate(tenantId, 'bs1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw NotFoundException when statement not found', async () => {
      mockStatementsRepo.findOne.mockResolvedValue(null);

      await expect(service.validate(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle statement with zero lines', async () => {
      mockStatementsRepo.findOne.mockResolvedValue({
        id: 'bs1',
        status: BankStatementStatus.OPEN,
        balanceStart: 5000,
        balanceEnd: 5000,
      });
      mockLinesRepo.findAllRaw.mockResolvedValue([]);
      mockStatementsRepo.update.mockResolvedValue({});

      const result = await service.validate(tenantId, 'bs1', auditContext);

      expect(result.balanceEndReal).toBe(5000);
      expect(result.totalLines).toBe(0);
    });
  });
});
