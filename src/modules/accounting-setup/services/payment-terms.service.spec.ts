jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/payment-terms.repository', () => ({
  PaymentTermsRepository: jest.fn(),
}));

jest.mock('@/database/sql/repositories/payment-term-lines.repository', () => ({
  PaymentTermLinesRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentTermsService } from './payment-terms.service';
import { PaymentTermsRepository } from '@/database/sql/repositories/payment-terms.repository';
import { PaymentTermLinesRepository } from '@/database/sql/repositories/payment-term-lines.repository';
import { PaymentTermLineType } from '@/common/enums/accounting-new.enums';

describe('PaymentTermsService', () => {
  let service: PaymentTermsService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockTermsRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdOrNull: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createTransaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  const mockLinesRepo = {
    findByPaymentTermId: jest.fn(),
    bulkCreate: jest.fn(),
    deleteByPaymentTermId: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTermsRepo.createTransaction.mockResolvedValue(mockTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentTermsService,
        { provide: PaymentTermsRepository, useValue: mockTermsRepo },
        { provide: PaymentTermLinesRepository, useValue: mockLinesRepo },
      ],
    }).compile();

    service = module.get<PaymentTermsService>(PaymentTermsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated payment terms', async () => {
      const expected = { data: [{ id: 'pt1' }], meta: { total: 1 } };
      mockTermsRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll(tenantId, {} as any);

      expect(mockTermsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          searchFields: ['nameEn', 'nameAr'],
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return payment term with lines', async () => {
      const term = { id: 'pt1', nameEn: 'Net 30' };
      const lines = [{ id: 'l1', type: PaymentTermLineType.BALANCE, days: 30 }];
      mockTermsRepo.findById.mockResolvedValue(term);
      mockLinesRepo.findByPaymentTermId.mockResolvedValue(lines);

      const result = await service.findById(tenantId, 'pt1');

      expect(result).toEqual({ id: 'pt1', nameEn: 'Net 30', lines });
      expect(mockTermsRepo.findById).toHaveBeenCalledWith('pt1', { tenantId });
      expect(mockLinesRepo.findByPaymentTermId).toHaveBeenCalledWith(tenantId, 'pt1');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      nameEn: 'Net 30',
      nameAr: 'صافي 30',
    };

    it('should create payment term without lines', async () => {
      const term = { id: 'pt1', nameEn: 'Net 30', nameAr: 'صافي 30' };
      mockTermsRepo.create.mockResolvedValue(term);

      const result = await service.create(tenantId, baseDto as any, auditContext);

      expect(mockTermsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: 'Net 30',
          nameAr: 'صافي 30',
          note: null,
        }),
        { tenantId, auditContext, transaction: mockTransaction },
      );
      expect(result).toEqual({ id: 'pt1', nameEn: 'Net 30', nameAr: 'صافي 30', lines: [] });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should create payment term with nested lines (percent + balance)', async () => {
      const term = { id: 'pt2', nameEn: '50/50' };
      const lines = [
        { type: PaymentTermLineType.PERCENT, value: 50, days: 0 },
        { type: PaymentTermLineType.BALANCE, value: 0, days: 30 },
      ];
      mockTermsRepo.create.mockResolvedValue(term);
      mockLinesRepo.bulkCreate.mockResolvedValue([
        { id: 'l1', ...lines[0] },
        { id: 'l2', ...lines[1] },
      ]);

      const result = await service.create(tenantId, { ...baseDto, lines } as any, auditContext);

      expect(mockLinesRepo.bulkCreate).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            paymentTermId: 'pt2',
            type: PaymentTermLineType.PERCENT,
            value: 50,
            days: 0,
            sequence: 0,
          }),
          expect.objectContaining({
            paymentTermId: 'pt2',
            type: PaymentTermLineType.BALANCE,
            value: 0,
            days: 30,
            sequence: 1,
          }),
        ]),
        tenantId,
        auditContext,
        transaction: mockTransaction,
      });
      expect(result.lines).toHaveLength(2);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should create payment term with fixed line type', async () => {
      const term = { id: 'pt3', nameEn: 'Fixed + Balance' };
      const lines = [
        { type: PaymentTermLineType.FIXED, value: 1000, days: 0 },
        { type: PaymentTermLineType.BALANCE, value: 0, days: 60 },
      ];
      mockTermsRepo.create.mockResolvedValue(term);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);

      await service.create(tenantId, { ...baseDto, lines } as any, auditContext);

      expect(mockLinesRepo.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ type: PaymentTermLineType.FIXED, value: 1000 }),
          ]),
        }),
      );
    });

    it('should use custom sequence when provided in line', async () => {
      const term = { id: 'pt4' };
      const lines = [{ type: PaymentTermLineType.BALANCE, value: 0, days: 30, sequence: 5 }];
      mockTermsRepo.create.mockResolvedValue(term);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }]);

      await service.create(tenantId, { ...baseDto, lines } as any, auditContext);

      expect(mockLinesRepo.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ sequence: 5 })]),
        }),
      );
    });

    it('should rollback transaction on error', async () => {
      mockTermsRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(tenantId, baseDto as any, auditContext)).rejects.toThrow(
        'DB error',
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should set dayOfMonth to null when not provided', async () => {
      const term = { id: 'pt5' };
      const lines = [{ type: PaymentTermLineType.BALANCE, value: 0, days: 30 }];
      mockTermsRepo.create.mockResolvedValue(term);
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l1' }]);

      await service.create(tenantId, { ...baseDto, lines } as any, auditContext);

      expect(mockLinesRepo.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ dayOfMonth: null })]),
        }),
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const existing = { id: 'pt1', nameEn: 'Net 30' };

    it('should throw NotFoundException when payment term does not exist', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { nameEn: 'X', version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update term data and keep existing lines when lines not in dto', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockTermsRepo.update.mockResolvedValue({ ...existing, nameEn: 'Net 60' });
      const existingLines = [{ id: 'l1', type: PaymentTermLineType.BALANCE }];
      mockLinesRepo.findByPaymentTermId.mockResolvedValue(existingLines);

      const result = await service.update(
        tenantId,
        'pt1',
        { nameEn: 'Net 60', version: 0 } as any,
        auditContext,
      );

      expect(mockLinesRepo.deleteByPaymentTermId).not.toHaveBeenCalled();
      expect(result.lines).toEqual(existingLines);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should delete old lines and recreate when lines are provided', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockTermsRepo.update.mockResolvedValue(existing);
      const newLines = [{ type: PaymentTermLineType.BALANCE, value: 0, days: 60 }];
      mockLinesRepo.bulkCreate.mockResolvedValue([{ id: 'l2', ...newLines[0] }]);

      const result = await service.update(
        tenantId,
        'pt1',
        { nameEn: 'Net 60', version: 0, lines: newLines } as any,
        auditContext,
      );

      expect(mockLinesRepo.deleteByPaymentTermId).toHaveBeenCalledWith(
        tenantId,
        'pt1',
        mockTransaction,
      );
      expect(mockLinesRepo.bulkCreate).toHaveBeenCalled();
      expect(result.lines).toHaveLength(1);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should delete all lines when empty array is provided', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockTermsRepo.update.mockResolvedValue(existing);

      const result = await service.update(
        tenantId,
        'pt1',
        { nameEn: 'No Lines', version: 0, lines: [] } as any,
        auditContext,
      );

      expect(mockLinesRepo.deleteByPaymentTermId).toHaveBeenCalledWith(
        tenantId,
        'pt1',
        mockTransaction,
      );
      expect(mockLinesRepo.bulkCreate).not.toHaveBeenCalled();
      expect(result.lines).toEqual([]);
    });

    it('should rollback transaction on error during update', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockTermsRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.update(tenantId, 'pt1', { nameEn: 'X', version: 0 } as any, auditContext),
      ).rejects.toThrow('Update failed');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should strip version from update payload', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue(existing);
      mockTermsRepo.update.mockResolvedValue(existing);
      mockLinesRepo.findByPaymentTermId.mockResolvedValue([]);

      await service.update(tenantId, 'pt1', { nameEn: 'X', version: 5 } as any, auditContext);

      const termData = mockTermsRepo.update.mock.calls[0][1];
      expect(termData).not.toHaveProperty('version');
      expect(termData).not.toHaveProperty('lines');
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete lines and soft delete term in transaction', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue({ id: 'pt1' });

      await service.remove(tenantId, 'pt1', auditContext);

      expect(mockLinesRepo.deleteByPaymentTermId).toHaveBeenCalledWith(
        tenantId,
        'pt1',
        mockTransaction,
      );
      expect(mockTermsRepo.softDelete).toHaveBeenCalledWith('pt1', {
        tenantId,
        auditContext,
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw NotFoundException when payment term does not exist', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback transaction on error during remove', async () => {
      mockTermsRepo.findByIdOrNull.mockResolvedValue({ id: 'pt1' });
      mockLinesRepo.deleteByPaymentTermId.mockRejectedValue(new Error('Delete failed'));

      await expect(service.remove(tenantId, 'pt1', auditContext)).rejects.toThrow('Delete failed');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
