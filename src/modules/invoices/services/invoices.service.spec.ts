// Mock uuid before any imports that depend on it (BaseEntity uses uuid)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

// Mock repository modules to avoid entity import issues
jest.mock('@/database/sql/repositories/invoices.repository', () => ({
  InvoicesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/invoice-lines.repository', () => ({
  InvoiceLinesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/invoice-line-taxes.repository', () => ({
  InvoiceLineTaxesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/payments-new.repository', () => ({
  PaymentsNewRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/invoice-payments.repository', () => ({
  InvoicePaymentsRepository: jest.fn(),
}));

// Mock CLS for msg() helper
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from '@/database/sql/repositories/invoices.repository';
import { InvoiceLinesRepository } from '@/database/sql/repositories/invoice-lines.repository';
import { InvoiceLineTaxesRepository } from '@/database/sql/repositories/invoice-line-taxes.repository';
import { PaymentsNewRepository } from '@/database/sql/repositories/payments-new.repository';
import { InvoicePaymentsRepository } from '@/database/sql/repositories/invoice-payments.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import {
  InvoiceStatusNew,
  InvoicePaymentStatus,
  PaymentTypeNew,
  PaymentStatusNew,
  InvoiceTypeNew,
} from '@/common/enums/invoice.enums';

describe('InvoicesService', () => {
  let service: InvoicesService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockInvoicesRepo = {
    findAll: jest.fn(),
    findByIdWithLines: jest.fn(),
    findByIdOrNull: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createTransaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  const mockInvoiceLinesRepo = {
    findByInvoiceId: jest.fn(),
    create: jest.fn(),
    deleteByInvoiceId: jest.fn(),
  };

  const mockInvoiceLineTaxesRepo = {
    create: jest.fn(),
  };

  const mockPaymentsNewRepo = {
    create: jest.fn(),
  };

  const mockInvoicePaymentsRepo = {
    create: jest.fn(),
    existsForInvoice: jest.fn(),
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

  const mockUnifiedSettings = {
    get: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
    mockInvoicesRepo.createTransaction.mockResolvedValue(mockTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: InvoicesRepository, useValue: mockInvoicesRepo },
        { provide: InvoiceLinesRepository, useValue: mockInvoiceLinesRepo },
        { provide: InvoiceLineTaxesRepository, useValue: mockInvoiceLineTaxesRepo },
        { provide: PaymentsNewRepository, useValue: mockPaymentsNewRepo },
        { provide: InvoicePaymentsRepository, useValue: mockInvoicePaymentsRepo },
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: StatusTransitionSharedService, useValue: mockStatusTransitionService },
        { provide: JournalPosterSharedService, useValue: mockJournalPosterService },
        { provide: AuditSharedService, useValue: mockAuditService },
        { provide: UnifiedSettingsService, useValue: mockUnifiedSettings },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call repository with default sorting', async () => {
      mockInvoicesRepo.findAll.mockResolvedValue({ data: [], meta: {} });

      await service.findAll(tenantId, {} as any);

      expect(mockInvoicesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          sortBy: 'invoiceDate',
          sortOrder: 'DESC',
          searchFields: ['invoiceNumber', 'reference'],
        }),
      );
    });

    it('should build where clause from query filters', async () => {
      mockInvoicesRepo.findAll.mockResolvedValue({ data: [], meta: {} });

      await service.findAll(tenantId, {
        invoiceType: InvoiceTypeNew.OUT_INVOICE,
        status: InvoiceStatusNew.POSTED,
        paymentStatus: InvoicePaymentStatus.NOT_PAID,
        partnerId: 'p-1',
        branchId: 'b-1',
      } as any);

      expect(mockInvoicesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoiceType: InvoiceTypeNew.OUT_INVOICE,
            status: InvoiceStatusNew.POSTED,
            paymentStatus: InvoicePaymentStatus.NOT_PAID,
            partnerId: 'p-1',
            branchId: 'b-1',
          }),
        }),
      );
    });

    it('should build date range filter when dateFrom and dateTo provided', async () => {
      mockInvoicesRepo.findAll.mockResolvedValue({ data: [], meta: {} });

      await service.findAll(tenantId, {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(mockInvoicesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoiceDate: expect.any(Object),
          }),
        }),
      );
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return invoice with lines when found', async () => {
      const invoice = { id: 'inv-1', invoiceNumber: 'INV-001' };
      mockInvoicesRepo.findByIdWithLines.mockResolvedValue(invoice);

      const result = await service.findById(tenantId, 'inv-1');

      expect(result).toEqual(invoice);
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      mockInvoicesRepo.findByIdWithLines.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      branchId: 'branch-1',
      partnerId: 'partner-1',
      invoiceType: InvoiceTypeNew.OUT_INVOICE,
      invoiceDate: '2026-03-17',
      lines: [
        {
          description: 'Product A',
          quantity: 2,
          unitPrice: 100,
        },
      ],
    };

    beforeEach(() => {
      mockSequencesService.nextNumber.mockResolvedValue('INV-00001');
      mockInvoicesRepo.create.mockResolvedValue({ id: 'inv-new' });
      mockInvoiceLinesRepo.create.mockResolvedValue({ id: 'line-1' });
      mockInvoicesRepo.findByIdWithLines.mockResolvedValue({
        id: 'inv-new',
        invoiceNumber: 'INV-00001',
        status: InvoiceStatusNew.DRAFT,
      });
    });

    it('should generate invoice number via SequencesService', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockSequencesService.nextNumber).toHaveBeenCalledWith(tenantId, 'invoice', 'branch-1');
    });

    it('should set status to DRAFT', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvoiceStatusNew.DRAFT }),
        expect.any(Object),
      );
    });

    it('should set paymentStatus to NOT_PAID', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: InvoicePaymentStatus.NOT_PAID }),
        expect.any(Object),
      );
    });

    it('should calculate line totals correctly (qty * price - discount, then 15% VAT)', async () => {
      const dto = {
        ...baseDto,
        lines: [{ description: 'Item', quantity: 10, unitPrice: 100, discountPct: 10 }],
      };

      await service.create(tenantId, dto, auditContext);

      // lineSubtotal = 10 * 100 * (1 - 10/100) = 900
      // priceTax = round(900 * 15) / 100 = 135
      // amountTotal = 900 + 135 = 1035
      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amountUntaxed: 900,
          amountTax: 135,
          amountTotal: 1035,
          amountResidual: 1035,
        }),
        expect.any(Object),
      );
    });

    it('should handle multiple lines', async () => {
      const dto = {
        ...baseDto,
        lines: [
          { description: 'A', quantity: 1, unitPrice: 100 },
          { description: 'B', quantity: 2, unitPrice: 50 },
        ],
      };

      await service.create(tenantId, dto, auditContext);

      // Line A: subtotal=100, tax=15, total=115
      // Line B: subtotal=100, tax=15, total=115
      // amountUntaxed=200, amountTax=30, amountTotal=230
      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amountUntaxed: 200,
          amountTax: 30,
          amountTotal: 230,
        }),
        expect.any(Object),
      );
    });

    it('should default exchangeRate to 1 when not provided', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ exchangeRate: 1 }),
        expect.any(Object),
      );
    });

    it('should calculate amountTotalBase with exchangeRate', async () => {
      const dto = {
        ...baseDto,
        exchangeRate: 3.75,
        lines: [{ description: 'A', quantity: 1, unitPrice: 100 }],
      };

      await service.create(tenantId, dto, auditContext);

      // amountTotal = 100 + 15 = 115
      // amountTotalBase = round(115 * 3.75 * 100) / 100 = 431.25
      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amountTotalBase: 431.25,
        }),
        expect.any(Object),
      );
    });

    it('should insert line taxes when taxIds provided', async () => {
      const dto = {
        ...baseDto,
        lines: [
          {
            description: 'A',
            quantity: 1,
            unitPrice: 100,
            taxIds: ['tax-1', 'tax-2'],
          },
        ],
      };

      await service.create(tenantId, dto, auditContext);

      expect(mockInvoiceLineTaxesRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should commit transaction on success', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockSequencesService.nextNumber.mockRejectedValue(new Error('seq error'));

      await expect(service.create(tenantId, baseDto, auditContext)).rejects.toThrow('seq error');

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should not commit/rollback when containerTransaction provided', async () => {
      const containerTx = { commit: jest.fn(), rollback: jest.fn() };
      mockInvoicesRepo.createTransaction.mockResolvedValue(containerTx);

      await service.create(tenantId, baseDto, auditContext, containerTx as any);

      expect(containerTx.commit).not.toHaveBeenCalled();
      expect(containerTx.rollback).not.toHaveBeenCalled();
    });

    it('should call audit service logCreate', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'invoice',
        'inv-new',
        expect.objectContaining({
          invoiceNumber: 'INV-00001',
          invoiceType: InvoiceTypeNew.OUT_INVOICE,
          partnerId: 'partner-1',
        }),
        auditContext.userId,
      );
    });

    it('should set optional fields to null when not provided', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: null,
          paymentTermId: null,
          saleOrderId: null,
          purchaseOrderId: null,
          currencyId: null,
          reference: null,
          narration: null,
          fiscalPositionId: null,
          journalId: null,
        }),
        expect.any(Object),
      );
    });

    it('should handle zero discount correctly', async () => {
      const dto = {
        ...baseDto,
        lines: [{ description: 'A', quantity: 1, unitPrice: 200, discountPct: 0 }],
      };

      await service.create(tenantId, dto, auditContext);

      expect(mockInvoicesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amountUntaxed: 200,
          amountTax: 30,
          amountTotal: 230,
        }),
        expect.any(Object),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const existingInvoice = {
      id: 'inv-1',
      status: InvoiceStatusNew.DRAFT,
      branchId: 'b-1',
      exchangeRate: 1,
    };

    beforeEach(() => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(existingInvoice);
      mockInvoicesRepo.findByIdWithLines.mockResolvedValue({ ...existingInvoice });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { partnerId: 'p-2' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when invoice is not draft', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...existingInvoice,
        status: InvoiceStatusNew.POSTED,
      });

      await expect(
        service.update(tenantId, 'inv-1', { partnerId: 'p-2' } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update simple fields', async () => {
      await service.update(tenantId, 'inv-1', { reference: 'REF-001' } as any, auditContext);

      expect(mockInvoicesRepo.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ reference: 'REF-001' }),
        expect.any(Object),
      );
    });

    it('should recalculate totals when lines are updated', async () => {
      const dto = {
        lines: [{ description: 'New Line', quantity: 5, unitPrice: 100 }],
      };

      await service.update(tenantId, 'inv-1', dto as any, auditContext);

      // Should delete old lines
      expect(mockInvoiceLinesRepo.deleteByInvoiceId).toHaveBeenCalledWith('inv-1', mockTransaction);

      // amountUntaxed=500, amountTax=75, amountTotal=575
      expect(mockInvoicesRepo.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          amountUntaxed: 500,
          amountTax: 75,
          amountTotal: 575,
          amountResidual: 575,
        }),
        expect.any(Object),
      );
    });

    it('should commit on success', async () => {
      await service.update(tenantId, 'inv-1', { reference: 'X' } as any, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback on error', async () => {
      mockInvoicesRepo.findByIdOrNull.mockRejectedValue(new Error('db error'));

      await expect(service.update(tenantId, 'inv-1', {} as any, auditContext)).rejects.toThrow(
        'db error',
      );

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should skip update call when no fields changed', async () => {
      await service.update(tenantId, 'inv-1', {} as any, auditContext);

      expect(mockInvoicesRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── post ───────────────────────────────────────────────────────────────────

  describe('post', () => {
    const draftInvoice = {
      id: 'inv-1',
      status: InvoiceStatusNew.DRAFT,
      invoiceType: InvoiceTypeNew.OUT_INVOICE,
      invoiceNumber: 'INV-001',
      invoiceDate: '2026-03-17',
      amountUntaxed: '1000',
      amountTax: '150',
      amountTotal: '1150',
      branchId: 'b-1',
    };

    beforeEach(() => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(draftInvoice);
      mockInvoiceLinesRepo.findByInvoiceId.mockResolvedValue([{ id: 'line-1' }]);
      mockUnifiedSettings.get.mockImplementation((_tid: string, key: string) => {
        const map: Record<string, string> = {
          coaAccountsReceivable: 'acc-recv-id',
          coaAccountsPayable: 'acc-pay-id',
          coaSalesRevenue: 'acc-rev-id',
          coaPurchasesExpense: 'acc-exp-id',
          coaVatPayable: 'acc-vat-id',
          coaCash: 'acc-cash-id',
        };
        return Promise.resolve(map[key] || null);
      });
      mockInvoicesRepo.findByIdWithLines.mockResolvedValue({
        ...draftInvoice,
        status: InvoiceStatusNew.POSTED,
      });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.post(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate status transition via StatusTransitionSharedService', async () => {
      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockStatusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'invoice_new',
        InvoiceStatusNew.DRAFT,
        InvoiceStatusNew.POSTED,
      );
    });

    it('should throw BadRequestException when invoice has no lines', async () => {
      mockInvoiceLinesRepo.findByInvoiceId.mockResolvedValue([]);

      await expect(service.post(tenantId, 'inv-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create journal entry for customer invoice (out_invoice): DR Receivable, CR Revenue + CR VAT', async () => {
      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          referenceType: 'invoice',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-recv-id', debit: 1150, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-rev-id', debit: 0, credit: 1000 }),
            expect.objectContaining({ accountId: 'acc-vat-id', debit: 0, credit: 150 }),
          ]),
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should create journal entry for vendor invoice (in_invoice): DR Expense + DR VAT, CR Payable', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...draftInvoice,
        invoiceType: InvoiceTypeNew.IN_INVOICE,
      });

      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-exp-id', debit: 1000, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-vat-id', debit: 150, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-pay-id', debit: 0, credit: 1150 }),
          ]),
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should create journal entry for customer refund (out_refund): DR Revenue + DR VAT, CR Receivable', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...draftInvoice,
        invoiceType: InvoiceTypeNew.OUT_REFUND,
      });

      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-rev-id', debit: 1000, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-vat-id', debit: 150, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-recv-id', debit: 0, credit: 1150 }),
          ]),
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should create journal entry for vendor refund (in_refund): DR Payable, CR Expense + CR VAT', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...draftInvoice,
        invoiceType: InvoiceTypeNew.IN_REFUND,
      });

      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-pay-id', debit: 1150, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-exp-id', debit: 0, credit: 1000 }),
            expect.objectContaining({ accountId: 'acc-vat-id', debit: 0, credit: 150 }),
          ]),
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should skip VAT journal line when amountTax is 0', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...draftInvoice,
        amountTax: '0',
        amountTotal: '1000',
      });

      await service.post(tenantId, 'inv-1', auditContext);

      const postCall = mockJournalPosterService.post.mock.calls[0];
      const lines = postCall[1].lines;
      expect(lines).toHaveLength(2); // No VAT line
    });

    it('should update status to POSTED', async () => {
      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockInvoicesRepo.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ status: InvoiceStatusNew.POSTED }),
        expect.any(Object),
      );
    });

    it('should call audit service logStatusChange', async () => {
      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockAuditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'invoice',
        'inv-1',
        InvoiceStatusNew.DRAFT,
        InvoiceStatusNew.POSTED,
        auditContext.userId,
      );
    });

    it('should commit transaction on success', async () => {
      await service.post(tenantId, 'inv-1', auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      mockInvoiceLinesRepo.findByInvoiceId.mockRejectedValue(new Error('db error'));

      await expect(service.post(tenantId, 'inv-1', auditContext)).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when accounting setting is missing', async () => {
      mockUnifiedSettings.get.mockResolvedValue(null);

      await expect(service.post(tenantId, 'inv-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    const draftInvoice = {
      id: 'inv-1',
      status: InvoiceStatusNew.DRAFT,
    };

    beforeEach(() => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(draftInvoice);
      mockInvoicePaymentsRepo.existsForInvoice.mockResolvedValue(false);
      mockInvoicesRepo.findByIdWithLines.mockResolvedValue({
        ...draftInvoice,
        status: InvoiceStatusNew.CANCELLED,
      });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.cancel(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate status transition', async () => {
      await service.cancel(tenantId, 'inv-1', auditContext);

      expect(mockStatusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'invoice_new',
        InvoiceStatusNew.DRAFT,
        InvoiceStatusNew.CANCELLED,
      );
    });

    it('should throw BadRequestException when invoice has payments', async () => {
      mockInvoicePaymentsRepo.existsForInvoice.mockResolvedValue(true);

      await expect(service.cancel(tenantId, 'inv-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update status to CANCELLED', async () => {
      await service.cancel(tenantId, 'inv-1', auditContext);

      expect(mockInvoicesRepo.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ status: InvoiceStatusNew.CANCELLED }),
        expect.any(Object),
      );
    });

    it('should call audit service logStatusChange', async () => {
      await service.cancel(tenantId, 'inv-1', auditContext);

      expect(mockAuditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'invoice',
        'inv-1',
        InvoiceStatusNew.DRAFT,
        InvoiceStatusNew.CANCELLED,
        auditContext.userId,
      );
    });

    it('should also allow cancelling posted invoices (with no payments)', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatusNew.POSTED,
      });

      await service.cancel(tenantId, 'inv-1', auditContext);

      expect(mockStatusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'invoice_new',
        InvoiceStatusNew.POSTED,
        InvoiceStatusNew.CANCELLED,
      );
    });

    it('should commit transaction on success', async () => {
      await service.cancel(tenantId, 'inv-1', auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      mockInvoicePaymentsRepo.existsForInvoice.mockRejectedValue(new Error('db error'));

      await expect(service.cancel(tenantId, 'inv-1', auditContext)).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });
  });

  // ── registerPayment ────────────────────────────────────────────────────────

  describe('registerPayment', () => {
    const postedInvoice = {
      id: 'inv-1',
      status: InvoiceStatusNew.POSTED,
      invoiceType: InvoiceTypeNew.OUT_INVOICE,
      invoiceNumber: 'INV-001',
      branchId: 'b-1',
      partnerId: 'p-1',
      amountResidual: '500',
      exchangeRate: 1,
      currencyId: 'cur-sar',
    };

    const paymentDto = {
      amount: 200,
      paymentDate: '2026-03-17',
    };

    beforeEach(() => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(postedInvoice);
      mockSequencesService.nextNumber.mockResolvedValue('PAY-00001');
      mockPaymentsNewRepo.create.mockResolvedValue({ id: 'pay-new' });
      mockUnifiedSettings.get.mockImplementation((_tid: string, key: string) => {
        const map: Record<string, string> = {
          coaCash: 'acc-cash',
          coaAccountsReceivable: 'acc-recv',
          coaAccountsPayable: 'acc-pay',
        };
        return Promise.resolve(map[key] || null);
      });
      mockInvoicesRepo.findByIdWithLines.mockResolvedValue({
        ...postedInvoice,
        amountResidual: 300,
        paymentStatus: InvoicePaymentStatus.PARTIAL,
      });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.registerPayment(tenantId, 'missing', paymentDto, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when invoice is not posted', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...postedInvoice,
        status: InvoiceStatusNew.DRAFT,
      });

      await expect(
        service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount exceeds residual', async () => {
      await expect(
        service.registerPayment(tenantId, 'inv-1', { ...paymentDto, amount: 600 }, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create payment with POSTED status', async () => {
      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockPaymentsNewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatusNew.POSTED,
          amount: 200,
        }),
        expect.any(Object),
      );
    });

    it('should determine INBOUND payment type for out_invoice', async () => {
      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockPaymentsNewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ paymentType: PaymentTypeNew.INBOUND }),
        expect.any(Object),
      );
    });

    it('should determine OUTBOUND payment type for in_invoice', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...postedInvoice,
        invoiceType: InvoiceTypeNew.IN_INVOICE,
      });

      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockPaymentsNewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ paymentType: PaymentTypeNew.OUTBOUND }),
        expect.any(Object),
      );
    });

    it('should determine INBOUND payment type for in_refund', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...postedInvoice,
        invoiceType: InvoiceTypeNew.IN_REFUND,
      });

      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockPaymentsNewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ paymentType: PaymentTypeNew.INBOUND }),
        expect.any(Object),
      );
    });

    it('should link payment to invoice via invoice_payments', async () => {
      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockInvoicePaymentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: 'inv-1',
          paymentId: 'pay-new',
          amount: 200,
          branchId: 'b-1',
        }),
        expect.any(Object),
      );
    });

    it('should update amountResidual and set paymentStatus to PARTIAL', async () => {
      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockInvoicesRepo.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          amountResidual: 300,
          paymentStatus: InvoicePaymentStatus.PARTIAL,
        }),
        expect.any(Object),
      );
    });

    it('should set paymentStatus to PAID when full amount is paid', async () => {
      await service.registerPayment(
        tenantId,
        'inv-1',
        { ...paymentDto, amount: 500 },
        auditContext,
      );

      expect(mockInvoicesRepo.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          amountResidual: 0,
          paymentStatus: InvoicePaymentStatus.PAID,
        }),
        expect.any(Object),
      );
    });

    it('should create journal entry for inbound payment: DR Cash, CR Receivable', async () => {
      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          referenceType: 'payment',
          lines: [
            expect.objectContaining({ accountId: 'acc-cash', debit: 200, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-recv', debit: 0, credit: 200 }),
          ],
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should create journal entry for outbound payment: DR Payable, CR Cash', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...postedInvoice,
        invoiceType: InvoiceTypeNew.IN_INVOICE,
      });

      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockJournalPosterService.post).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          lines: [
            expect.objectContaining({ accountId: 'acc-pay', debit: 200, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-cash', debit: 0, credit: 200 }),
          ],
        }),
        auditContext,
        mockTransaction,
      );
    });

    it('should commit transaction on success', async () => {
      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      mockPaymentsNewRepo.create.mockRejectedValue(new Error('db error'));

      await expect(
        service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext),
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should calculate amountBase using exchangeRate', async () => {
      await service.registerPayment(
        tenantId,
        'inv-1',
        { ...paymentDto, exchangeRate: 3.75 },
        auditContext,
      );

      expect(mockPaymentsNewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amountBase: 750,
          exchangeRate: 3.75,
        }),
        expect.any(Object),
      );
    });

    it('should use invoice exchangeRate when not provided in dto', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        ...postedInvoice,
        exchangeRate: 2.5,
      });

      await service.registerPayment(tenantId, 'inv-1', paymentDto, auditContext);

      expect(mockPaymentsNewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          exchangeRate: 2.5,
          amountBase: 500,
        }),
        expect.any(Object),
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete draft invoice', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatusNew.DRAFT,
      });

      await service.remove(tenantId, 'inv-1', auditContext);

      expect(mockInvoicesRepo.softDelete).toHaveBeenCalledWith('inv-1', {
        tenantId,
        auditContext,
      });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when invoice is not draft', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatusNew.POSTED,
      });

      await expect(service.remove(tenantId, 'inv-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call audit service logDelete', async () => {
      mockInvoicesRepo.findByIdOrNull.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatusNew.DRAFT,
      });

      await service.remove(tenantId, 'inv-1', auditContext);

      expect(mockAuditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'invoice',
        'inv-1',
        {},
        auditContext.userId,
      );
    });
  });
});
