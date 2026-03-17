jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { BadRequestException } from '@nestjs/common';
import { JournalPosterSharedService } from './journal-poster-shared.service';
import { JournalEntryType, FiscalPeriodStatus } from '@/common/enums/accounting.enums';
import { JournalEntryTypeNew, JournalType } from '@/common/enums/accounting-new.enums';

describe('JournalPosterSharedService', () => {
  let service: JournalPosterSharedService;
  let journalEntriesRepository: Record<string, jest.Mock>;
  let journalLinesRepository: Record<string, jest.Mock>;
  let fiscalPeriodsRepository: Record<string, jest.Mock>;
  let journalsRepository: Record<string, jest.Mock>;
  let unifiedSettings: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    journalEntriesRepository = {
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      create: jest.fn().mockResolvedValue({ id: 'entry-001' }),
      nextEntryNumberForJournal: jest.fn().mockResolvedValue('AUTO-0001'),
    };

    journalLinesRepository = {
      bulkInsertLines: jest.fn().mockResolvedValue(undefined),
    };

    fiscalPeriodsRepository = {
      findPeriodForDate: jest.fn().mockResolvedValue({
        id: 'period-001',
        status: FiscalPeriodStatus.OPEN,
      }),
    };

    journalsRepository = {
      findByType: jest.fn().mockResolvedValue({
        id: 'journal-001',
        sequencePrefix: 'SJ',
      }),
    };

    unifiedSettings = {
      get: jest.fn().mockResolvedValue(null),
    };

    service = new JournalPosterSharedService(
      journalEntriesRepository as any,
      journalLinesRepository as any,
      fiscalPeriodsRepository as any,
      journalsRepository as any,
      unifiedSettings as any,
    );
  });

  // Helper to mock settings lookup
  const mockSettings = (map: Record<string, string>) => {
    unifiedSettings.get.mockImplementation((_t: string, key: string) =>
      Promise.resolve(map[key] ?? null),
    );
  };

  // ── postSalesInvoice ────────────────────────────────────────────────────

  describe('postSalesInvoice()', () => {
    const invoiceData = {
      entryDate: '2026-03-15',
      invoiceNumber: 'INV-001',
      subtotal: 1000,
      taxAmount: 150,
      totalAmount: 1150,
      partnerId: 'partner-001',
      referenceId: 'invoice-001',
      referenceType: 'sales_invoice',
    };

    beforeEach(() => {
      mockSettings({
        coaAccountsReceivable: 'ar-acc',
        coaSalesRevenue: 'rev-acc',
        coaVatPayable: 'vat-acc',
      });
    });

    it('should DR Accounts Receivable with partnerId', async () => {
      await service.postSalesInvoice(tenantId, invoiceData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const arLine = lines.find((l: any) => l.accountId === 'ar-acc');
      expect(arLine).toBeDefined();
      expect(arLine.debit).toBe(1150);
      expect(arLine.credit).toBe(0);
      expect(arLine.partnerId).toBe('partner-001');
    });

    it('should CR Sales Revenue for subtotal', async () => {
      await service.postSalesInvoice(tenantId, invoiceData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const revLine = lines.find((l: any) => l.accountId === 'rev-acc');
      expect(revLine).toBeDefined();
      expect(revLine.debit).toBe(0);
      expect(revLine.credit).toBe(1000);
    });

    it('should CR VAT Payable for tax amount', async () => {
      await service.postSalesInvoice(tenantId, invoiceData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const vatLine = lines.find((l: any) => l.accountId === 'vat-acc');
      expect(vatLine).toBeDefined();
      expect(vatLine.debit).toBe(0);
      expect(vatLine.credit).toBe(150);
    });

    it('should use sale journal type', async () => {
      await service.postSalesInvoice(tenantId, invoiceData, auditContext as any);

      expect(journalsRepository.findByType).toHaveBeenCalledWith(
        tenantId,
        JournalType.SALE,
        mockTransaction,
      );
    });

    it('should create entry with INVOICE entryTypeNew', async () => {
      await service.postSalesInvoice(tenantId, invoiceData, auditContext as any);

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entryTypeNew: JournalEntryTypeNew.INVOICE,
          isPosted: true,
        }),
        expect.any(Object),
      );
    });

    it('should skip VAT line when taxAmount is 0', async () => {
      await service.postSalesInvoice(
        tenantId,
        { ...invoiceData, taxAmount: 0, totalAmount: 1000 },
        auditContext as any,
      );

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      expect(lines).toHaveLength(2); // AR + Revenue only
    });

    it('should use override account IDs when provided', async () => {
      await service.postSalesInvoice(
        tenantId,
        {
          ...invoiceData,
          arAccountId: 'custom-ar',
          revenueAccountId: 'custom-rev',
          vatAccountId: 'custom-vat',
        },
        auditContext as any,
      );

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      expect(lines[0].accountId).toBe('custom-ar');
      expect(lines[1].accountId).toBe('custom-rev');
      expect(lines[2].accountId).toBe('custom-vat');
    });
  });

  // ── postPurchaseBill ────────────────────────────────────────────────────

  describe('postPurchaseBill()', () => {
    const billData = {
      entryDate: '2026-03-15',
      billNumber: 'BILL-001',
      subtotal: 2000,
      taxAmount: 300,
      totalAmount: 2300,
      partnerId: 'vendor-001',
      referenceId: 'bill-001',
      referenceType: 'purchase_bill',
    };

    beforeEach(() => {
      mockSettings({
        coaAccountsPayable: 'ap-acc',
        coaInventory: 'inv-acc',
        coaInputVat: 'input-vat-acc',
      });
    });

    it('should DR Inventory/Expense for totalAmount when not tracking input VAT', async () => {
      await service.postPurchaseBill(tenantId, billData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const expLine = lines.find((l: any) => l.accountId === 'inv-acc');
      expect(expLine.debit).toBe(2300);
    });

    it('should CR Accounts Payable with partnerId', async () => {
      await service.postPurchaseBill(tenantId, billData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const apLine = lines.find((l: any) => l.accountId === 'ap-acc');
      expect(apLine.debit).toBe(0);
      expect(apLine.credit).toBe(2300);
      expect(apLine.partnerId).toBe('vendor-001');
    });

    it('should use purchase journal type', async () => {
      await service.postPurchaseBill(tenantId, billData, auditContext as any);

      expect(journalsRepository.findByType).toHaveBeenCalledWith(
        tenantId,
        JournalType.PURCHASE,
        mockTransaction,
      );
    });

    it('should split DR into subtotal + input VAT when trackInputVat is true', async () => {
      await service.postPurchaseBill(
        tenantId,
        { ...billData, trackInputVat: true },
        auditContext as any,
      );

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const invLine = lines.find((l: any) => l.accountId === 'inv-acc');
      const vatLine = lines.find((l: any) => l.accountId === 'input-vat-acc');

      expect(invLine.debit).toBe(2000); // subtotal
      expect(vatLine.debit).toBe(300); // tax
    });
  });

  // ── postStockMovement ───────────────────────────────────────────────────

  describe('postStockMovement()', () => {
    const stockData = {
      entryDate: '2026-03-15',
      description: 'Stock Transfer',
      referenceId: 'move-001',
      referenceType: 'stock_movement',
      inventoryAccountId: 'inv-acc-src',
      counterAccountId: 'inv-acc-dst',
      amount: 500,
    };

    it('should DR inventory account and CR counter account', async () => {
      await service.postStockMovement(tenantId, stockData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      expect(lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ accountId: 'inv-acc-src', debit: 500, credit: 0 }),
          expect.objectContaining({ accountId: 'inv-acc-dst', debit: 0, credit: 500 }),
        ]),
      );
    });

    it('should use STOCK entryTypeNew', async () => {
      await service.postStockMovement(tenantId, stockData, auditContext as any);

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ entryTypeNew: JournalEntryTypeNew.STOCK }),
        expect.any(Object),
      );
    });
  });

  // ── postPosOrder (POS) ──────────────────────────────────────────────────

  describe('postPosOrder()', () => {
    const posData = {
      entryDate: '2026-03-15',
      orderNumber: 'POS-001',
      totalAmount: 115,
      subtotal: 100,
      taxAmount: 15,
    };

    beforeEach(() => {
      mockSettings({
        coaCash: 'cash-acc',
        coaSalesRevenue: 'rev-acc',
        coaVatPayable: 'vat-acc',
      });
    });

    it('should DR Cash for totalAmount', async () => {
      await service.postPosOrder(tenantId, 'order-001', posData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const cashLine = lines.find((l: any) => l.accountId === 'cash-acc');
      expect(cashLine.debit).toBe(115);
      expect(cashLine.credit).toBe(0);
    });

    it('should CR Revenue for subtotal', async () => {
      await service.postPosOrder(tenantId, 'order-001', posData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const revLine = lines.find((l: any) => l.accountId === 'rev-acc');
      expect(revLine.credit).toBe(100);
    });

    it('should CR VAT for tax amount', async () => {
      await service.postPosOrder(tenantId, 'order-001', posData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const vatLine = lines.find((l: any) => l.accountId === 'vat-acc');
      expect(vatLine.credit).toBe(15);
    });

    it('should use sale journal and PAYMENT entryTypeNew', async () => {
      await service.postPosOrder(tenantId, 'order-001', posData, auditContext as any);

      expect(journalsRepository.findByType).toHaveBeenCalledWith(
        tenantId,
        JournalType.SALE,
        mockTransaction,
      );
      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ entryTypeNew: JournalEntryTypeNew.PAYMENT }),
        expect.any(Object),
      );
    });

    it('should skip VAT line when tax is 0', async () => {
      await service.postPosOrder(
        tenantId,
        'order-001',
        { ...posData, taxAmount: 0, totalAmount: 100 },
        auditContext as any,
      );

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      expect(lines).toHaveLength(2);
    });
  });

  // ── postPayroll ─────────────────────────────────────────────────────────

  describe('postPayroll()', () => {
    const payrollData = {
      entryDate: '2026-03-31',
      payrollRunNumber: 'PR-2026-03',
      netSalaries: 50000,
      gosiEmployerAmount: 6000,
      gosiEmployeeAmount: 5000,
    };

    beforeEach(() => {
      mockSettings({
        coaSalariesExpense: 'sal-exp',
        coaGosiExpense: 'gosi-exp',
        coaSalariesPayable: 'sal-pay',
        coaGosiPayable: 'gosi-pay',
      });
    });

    it('should DR Salary Expense for netSalaries', async () => {
      await service.postPayroll(tenantId, 'run-001', payrollData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const salLine = lines.find((l: any) => l.accountId === 'sal-exp');
      expect(salLine.debit).toBe(50000);
    });

    it('should DR GOSI Expense for employer amount', async () => {
      await service.postPayroll(tenantId, 'run-001', payrollData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const gosiLine = lines.find((l: any) => l.accountId === 'gosi-exp');
      expect(gosiLine.debit).toBe(6000);
    });

    it('should CR Salaries Payable for net minus employee GOSI', async () => {
      await service.postPayroll(tenantId, 'run-001', payrollData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const salPayLine = lines.find((l: any) => l.accountId === 'sal-pay');
      expect(salPayLine.credit).toBe(45000); // 50000 - 5000
    });

    it('should CR GOSI Payable for employer + employee amounts', async () => {
      await service.postPayroll(tenantId, 'run-001', payrollData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const gosiPayLine = lines.find((l: any) => l.accountId === 'gosi-pay');
      expect(gosiPayLine.credit).toBe(11000); // 6000 + 5000
    });

    it('should produce balanced entry (total DR = total CR)', async () => {
      await service.postPayroll(tenantId, 'run-001', payrollData, auditContext as any);

      const lines = journalLinesRepository.bulkInsertLines.mock.calls[0][1];
      const totalDr = lines.reduce((s: number, l: any) => s + l.debit, 0);
      const totalCr = lines.reduce((s: number, l: any) => s + l.credit, 0);
      expect(totalDr).toBe(totalCr);
    });

    it('should use PAYROLL entryTypeNew and GENERAL journal', async () => {
      await service.postPayroll(tenantId, 'run-001', payrollData, auditContext as any);

      expect(journalsRepository.findByType).toHaveBeenCalledWith(
        tenantId,
        JournalType.GENERAL,
        mockTransaction,
      );
      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ entryTypeNew: JournalEntryTypeNew.PAYROLL }),
        expect.any(Object),
      );
    });
  });

  // ── Graceful fallback ───────────────────────────────────────────────────

  describe('graceful journal fallback', () => {
    beforeEach(() => {
      mockSettings({
        coaCash: 'cash-acc',
        coaSalesRevenue: 'rev-acc',
        coaVatPayable: 'vat-acc',
      });
    });

    it('should fall back to general journal if sale journal not found', async () => {
      journalsRepository.findByType
        .mockResolvedValueOnce(null) // sale journal not found
        .mockResolvedValueOnce({ id: 'general-j', sequencePrefix: 'GJ' }); // general journal found

      await service.postPosOrder(
        tenantId,
        'order-001',
        {
          entryDate: '2026-03-15',
          orderNumber: 'POS-001',
          totalAmount: 100,
          subtotal: 100,
          taxAmount: 0,
        },
        auditContext as any,
      );

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ journalId: 'general-j' }),
        expect.any(Object),
      );
    });

    it('should proceed with null journalId if no journals configured at all', async () => {
      journalsRepository.findByType.mockResolvedValue(null);

      await service.postPosOrder(
        tenantId,
        'order-001',
        {
          entryDate: '2026-03-15',
          orderNumber: 'POS-001',
          totalAmount: 100,
          subtotal: 100,
          taxAmount: 0,
        },
        auditContext as any,
      );

      expect(journalEntriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ journalId: null }),
        expect.any(Object),
      );
    });
  });

  // ── Fiscal lock date validation ─────────────────────────────────────────

  describe('fiscal lock date validation on all posts', () => {
    it('should throw if entry date is before lock date', async () => {
      mockSettings({
        fiscalLockDate: '2026-03-31',
        coaCash: 'cash-acc',
        coaSalesRevenue: 'rev-acc',
        coaVatPayable: 'vat-acc',
      });

      await expect(
        service.postPosOrder(
          tenantId,
          'order-001',
          {
            entryDate: '2026-03-15',
            orderNumber: 'POS-001',
            totalAmount: 100,
            subtotal: 100,
            taxAmount: 0,
          },
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if entry date equals lock date', async () => {
      mockSettings({
        fiscalLockDate: '2026-03-15',
        coaCash: 'cash-acc',
        coaSalesRevenue: 'rev-acc',
        coaVatPayable: 'vat-acc',
      });

      await expect(
        service.postPosOrder(
          tenantId,
          'order-001',
          {
            entryDate: '2026-03-15',
            orderNumber: 'POS-001',
            totalAmount: 100,
            subtotal: 100,
            taxAmount: 0,
          },
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Missing settings ────────────────────────────────────────────────────

  describe('missing settings', () => {
    it('should throw when required COA setting is missing', async () => {
      unifiedSettings.get.mockResolvedValue(null);

      await expect(
        service.postPosOrder(
          tenantId,
          'order-001',
          {
            entryDate: '2026-03-15',
            orderNumber: 'POS-001',
            totalAmount: 100,
            subtotal: 100,
            taxAmount: 0,
          },
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Closed fiscal period ────────────────────────────────────────────────

  describe('closed fiscal period', () => {
    beforeEach(() => {
      mockSettings({
        coaCash: 'cash-acc',
        coaSalesRevenue: 'rev-acc',
        coaVatPayable: 'vat-acc',
      });
    });

    it('should throw if period is closed', async () => {
      fiscalPeriodsRepository.findPeriodForDate.mockResolvedValue({
        id: 'period-001',
        status: FiscalPeriodStatus.CLOSED,
      });

      await expect(
        service.postPosOrder(
          tenantId,
          'order-001',
          {
            entryDate: '2026-03-15',
            orderNumber: 'POS-001',
            totalAmount: 100,
            subtotal: 100,
            taxAmount: 0,
          },
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if period is locked', async () => {
      fiscalPeriodsRepository.findPeriodForDate.mockResolvedValue({
        id: 'period-001',
        status: FiscalPeriodStatus.LOCKED,
      });

      await expect(
        service.postPosOrder(
          tenantId,
          'order-001',
          {
            entryDate: '2026-03-15',
            orderNumber: 'POS-001',
            totalAmount: 100,
            subtotal: 100,
            taxAmount: 0,
          },
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if no period found for date', async () => {
      fiscalPeriodsRepository.findPeriodForDate.mockResolvedValue(null);

      await expect(
        service.postPosOrder(
          tenantId,
          'order-001',
          {
            entryDate: '2026-03-15',
            orderNumber: 'POS-001',
            totalAmount: 100,
            subtotal: 100,
            taxAmount: 0,
          },
          auditContext as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
