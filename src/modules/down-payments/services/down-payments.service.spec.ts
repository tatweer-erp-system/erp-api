// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/down-payments.repository', () => ({
  DownPaymentsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/sales-orders.repository', () => ({
  SalesOrdersRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DownPaymentsService } from './down-payments.service';
import { DownPaymentsRepository } from '@/database/sql/repositories/down-payments.repository';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { DownPaymentType } from '@/common/enums/pricelist.enums';

describe('DownPaymentsService', () => {
  let service: DownPaymentsService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockDownPaymentsRepo = {
    findBySaleOrderId: jest.fn(),
    findOneById: jest.fn(),
    insertDownPayment: jest.fn(),
    getUndeductedTotal: jest.fn(),
    markDeducted: jest.fn(),
    createTransaction: jest.fn(({ transaction } = {} as any) => transaction ?? mockTransaction),
  };

  const mockSalesOrdersRepo = {
    findOneById: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logStatusChange: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownPaymentsService,
        { provide: DownPaymentsRepository, useValue: mockDownPaymentsRepo },
        { provide: SalesOrdersRepository, useValue: mockSalesOrdersRepo },
        { provide: AuditSharedService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DownPaymentsService>(DownPaymentsService);
  });

  // ── findBySaleOrder ────────────────────────────────────────────────────────

  describe('findBySaleOrder', () => {
    it('should return down payments for a sale order', async () => {
      const payments = [
        { id: 'dp-1', saleOrderId: 'so-1', amount: 100 },
        { id: 'dp-2', saleOrderId: 'so-1', amount: 200 },
      ];
      mockDownPaymentsRepo.findBySaleOrderId.mockResolvedValue(payments);

      const result = await service.findBySaleOrder(tenantId, 'so-1');

      expect(mockDownPaymentsRepo.findBySaleOrderId).toHaveBeenCalledWith(tenantId, 'so-1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no down payments exist', async () => {
      mockDownPaymentsRepo.findBySaleOrderId.mockResolvedValue([]);

      const result = await service.findBySaleOrder(tenantId, 'so-1');

      expect(result).toEqual([]);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const order = { id: 'so-1', totalAmount: '1000', total: '1000' };

    it('should create percentage down payment (10% of 1000 = 100)', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);
      mockDownPaymentsRepo.insertDownPayment.mockResolvedValue('dp-new');
      const created = { id: 'dp-new', amount: 100 };
      mockDownPaymentsRepo.findOneById.mockResolvedValue(created);

      const result = await service.create(
        tenantId,
        'so-1',
        { type: DownPaymentType.PERCENTAGE, value: 10, branchId: 'branch-1' } as any,
        auditContext,
      );

      expect(mockDownPaymentsRepo.insertDownPayment).toHaveBeenCalledWith(tenantId, {
        branchId: 'branch-1',
        saleOrderId: 'so-1',
        invoiceId: null,
        type: DownPaymentType.PERCENTAGE,
        value: 10,
        amount: 100,
        createdBy: 'user-001',
      });
      expect(result.id).toBe('dp-new');
    });

    it('should create percentage down payment (25% of 1000 = 250)', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);
      mockDownPaymentsRepo.insertDownPayment.mockResolvedValue('dp-25');
      mockDownPaymentsRepo.findOneById.mockResolvedValue({ id: 'dp-25', amount: 250 });

      await service.create(
        tenantId,
        'so-1',
        { type: DownPaymentType.PERCENTAGE, value: 25, branchId: 'b1' } as any,
        auditContext,
      );

      expect(mockDownPaymentsRepo.insertDownPayment).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ amount: 250 }),
      );
    });

    it('should create fixed down payment (amount = value)', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);
      mockDownPaymentsRepo.insertDownPayment.mockResolvedValue('dp-fixed');
      mockDownPaymentsRepo.findOneById.mockResolvedValue({ id: 'dp-fixed', amount: 300 });

      await service.create(
        tenantId,
        'so-1',
        { type: DownPaymentType.FIXED, value: 300, branchId: 'b1' } as any,
        auditContext,
      );

      expect(mockDownPaymentsRepo.insertDownPayment).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ amount: 300 }),
      );
    });

    it('should use totalAmount field from order', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue({
        id: 'so-2',
        totalAmount: '500',
        total: null,
      });
      mockDownPaymentsRepo.insertDownPayment.mockResolvedValue('dp-x');
      mockDownPaymentsRepo.findOneById.mockResolvedValue({ id: 'dp-x', amount: 50 });

      await service.create(
        tenantId,
        'so-2',
        { type: DownPaymentType.PERCENTAGE, value: 10, branchId: 'b1' } as any,
        auditContext,
      );

      // 10% of 500 = 50
      expect(mockDownPaymentsRepo.insertDownPayment).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ amount: 50 }),
      );
    });

    it('should fall back to total field when totalAmount is null', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue({
        id: 'so-3',
        totalAmount: null,
        total: '800',
      });
      mockDownPaymentsRepo.insertDownPayment.mockResolvedValue('dp-y');
      mockDownPaymentsRepo.findOneById.mockResolvedValue({ id: 'dp-y', amount: 400 });

      await service.create(
        tenantId,
        'so-3',
        { type: DownPaymentType.PERCENTAGE, value: 50, branchId: 'b1' } as any,
        auditContext,
      );

      // 50% of 800 = 400
      expect(mockDownPaymentsRepo.insertDownPayment).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ amount: 400 }),
      );
    });

    it('should throw BadRequestException when percentage < 0', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);

      await expect(
        service.create(
          tenantId,
          'so-1',
          { type: DownPaymentType.PERCENTAGE, value: -5, branchId: 'b1' } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when percentage > 100', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);

      await expect(
        service.create(
          tenantId,
          'so-1',
          { type: DownPaymentType.PERCENTAGE, value: 150, branchId: 'b1' } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount exceeds order total', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);

      await expect(
        service.create(
          tenantId,
          'so-1',
          { type: DownPaymentType.FIXED, value: 1500, branchId: 'b1' } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount is 0', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);

      await expect(
        service.create(
          tenantId,
          'so-1',
          { type: DownPaymentType.FIXED, value: 0, branchId: 'b1' } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when sales order not found', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(null);

      await expect(
        service.create(
          tenantId,
          'missing',
          { type: DownPaymentType.FIXED, value: 100, branchId: 'b1' } as any,
          auditContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log audit after creation', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(order);
      mockDownPaymentsRepo.insertDownPayment.mockResolvedValue('dp-audit');
      const created = { id: 'dp-audit', amount: 100 };
      mockDownPaymentsRepo.findOneById.mockResolvedValue(created);

      await service.create(
        tenantId,
        'so-1',
        { type: DownPaymentType.FIXED, value: 100, branchId: 'b1' } as any,
        auditContext,
      );

      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'sales.down_payments',
        'dp-audit',
        created,
        'user-001',
      );
    });

    it('should round amount to 2 decimal places for percentage', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue({
        id: 'so-1',
        totalAmount: '333',
        total: '333',
      });
      mockDownPaymentsRepo.insertDownPayment.mockResolvedValue('dp-round');
      mockDownPaymentsRepo.findOneById.mockResolvedValue({ id: 'dp-round' });

      await service.create(
        tenantId,
        'so-1',
        { type: DownPaymentType.PERCENTAGE, value: 33, branchId: 'b1' } as any,
        auditContext,
      );

      // Math.round(333 * 33) / 100 = Math.round(10989) / 100 = 109.89
      const calledWith = mockDownPaymentsRepo.insertDownPayment.mock.calls[0][1];
      expect(calledWith.amount).toBe(109.89);
    });
  });

  // ── deductAll ──────────────────────────────────────────────────────────────

  describe('deductAll', () => {
    it('should deduct all undeducted down payments and return total', async () => {
      mockDownPaymentsRepo.getUndeductedTotal.mockResolvedValue(500);

      const result = await service.deductAll(tenantId, 'so-1', 'inv-final', auditContext);

      expect(result).toEqual({ deductedTotal: 500, finalInvoiceId: 'inv-final' });
      expect(mockDownPaymentsRepo.markDeducted).toHaveBeenCalledWith(
        tenantId,
        'so-1',
        'user-001',
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should return 0 when no undeducted down payments', async () => {
      mockDownPaymentsRepo.getUndeductedTotal.mockResolvedValue(0);

      const result = await service.deductAll(tenantId, 'so-1', 'inv-final', auditContext);

      expect(result).toEqual({ deductedTotal: 0 });
      expect(mockDownPaymentsRepo.markDeducted).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should log status change after deduction', async () => {
      mockDownPaymentsRepo.getUndeductedTotal.mockResolvedValue(300);

      await service.deductAll(tenantId, 'so-1', 'inv-final', auditContext);

      expect(mockAuditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'sales.down_payments',
        'so-1',
        'pending',
        'deducted',
        'user-001',
      );
    });

    it('should not commit or rollback when containerTransaction is provided', async () => {
      const externalTx = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      mockDownPaymentsRepo.getUndeductedTotal.mockResolvedValue(100);

      await service.deductAll(tenantId, 'so-1', 'inv-final', auditContext, externalTx as any);

      // isOwner = false, so no commit/rollback
      expect(externalTx.commit).not.toHaveBeenCalled();
      expect(externalTx.rollback).not.toHaveBeenCalled();
    });

    it('should rollback on error when owner', async () => {
      mockDownPaymentsRepo.getUndeductedTotal.mockResolvedValue(500);
      mockDownPaymentsRepo.markDeducted.mockRejectedValue(new Error('DB error'));

      await expect(service.deductAll(tenantId, 'so-1', 'inv-final', auditContext)).rejects.toThrow(
        'DB error',
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should not rollback on error when not owner', async () => {
      const externalTx = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      mockDownPaymentsRepo.getUndeductedTotal.mockResolvedValue(500);
      mockDownPaymentsRepo.markDeducted.mockRejectedValue(new Error('DB error'));

      await expect(
        service.deductAll(tenantId, 'so-1', 'inv-final', auditContext, externalTx as any),
      ).rejects.toThrow('DB error');

      expect(externalTx.commit).not.toHaveBeenCalled();
      expect(externalTx.rollback).not.toHaveBeenCalled();
    });
  });
});
