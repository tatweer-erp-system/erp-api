import { FinancialSharedService } from './financial-shared.service';

describe('FinancialSharedService', () => {
  let service: FinancialSharedService;

  beforeEach(() => {
    service = new FinancialSharedService();
  });

  // ─── calculateInvoiceTotals() ─────────────────────────────────────────

  describe('calculateInvoiceTotals()', () => {
    it('should calculate totals for single line (no discount)', () => {
      const result = service.calculateInvoiceTotals([{ unitPrice: 100, quantity: 2, taxRate: 15 }]);

      expect(result.subtotalBeforeDiscount.toNumber()).toBe(200);
      expect(result.totalDiscount.toNumber()).toBe(0);
      expect(result.subtotalAfterDiscount.toNumber()).toBe(200);
      expect(result.totalTax.toNumber()).toBe(30); // 200 * 15%
      expect(result.grandTotal.toNumber()).toBe(230);
    });

    it('should calculate tax after discount (ZATCA compliant)', () => {
      const result = service.calculateInvoiceTotals([
        { unitPrice: 100, quantity: 1, discountAmount: 20, taxRate: 15 },
      ]);

      // lineTotal = 100, discount = 20, taxable = 80
      // tax = 80 * 15% = 12
      expect(result.subtotalAfterDiscount.toNumber()).toBe(80);
      expect(result.totalTax.toNumber()).toBe(12);
      expect(result.grandTotal.toNumber()).toBe(92);
    });

    it('should aggregate multiple lines', () => {
      const result = service.calculateInvoiceTotals([
        { unitPrice: 50, quantity: 3, taxRate: 15 },
        { unitPrice: 200, quantity: 1, discountAmount: 10, taxRate: 15 },
      ]);

      // Line 1: 150, tax = 22.50
      // Line 2: 200 - 10 = 190, tax = 28.50
      expect(result.subtotalBeforeDiscount.toNumber()).toBe(350);
      expect(result.totalDiscount.toNumber()).toBe(10);
      expect(result.subtotalAfterDiscount.toNumber()).toBe(340);
      expect(result.totalTax.toNumber()).toBe(51);
      expect(result.grandTotal.toNumber()).toBe(391);
    });

    it('should handle zero tax rate', () => {
      const result = service.calculateInvoiceTotals([{ unitPrice: 100, quantity: 1, taxRate: 0 }]);

      expect(result.totalTax.toNumber()).toBe(0);
      expect(result.grandTotal.toNumber()).toBe(100);
    });
  });

  // ─── buildZATCAInvoiceLine() ──────────────────────────────────────────

  describe('buildZATCAInvoiceLine()', () => {
    it('should build a ZATCA line with correct values', () => {
      const result = service.buildZATCAInvoiceLine({
        unitPrice: 100,
        quantity: 2,
        discountAmount: 30,
        taxRate: 15,
      });

      expect(result.lineTotal.toNumber()).toBe(200);
      expect(result.discountAmount.toNumber()).toBe(30);
      expect(result.taxableAmount.toNumber()).toBe(170);
      expect(result.taxRate.toNumber()).toBe(15);
      expect(result.taxAmount.toNumber()).toBe(25.5);
      expect(result.totalWithTax.toNumber()).toBe(195.5);
    });

    it('should handle zero discount', () => {
      const result = service.buildZATCAInvoiceLine({
        unitPrice: 50,
        quantity: 1,
        discountAmount: 0,
        taxRate: 15,
      });

      expect(result.taxableAmount.toNumber()).toBe(50);
      expect(result.taxAmount.toNumber()).toBe(7.5);
      expect(result.totalWithTax.toNumber()).toBe(57.5);
    });
  });

  // ─── validateZATCAInvoice() ───────────────────────────────────────────

  describe('validateZATCAInvoice()', () => {
    it('should return valid for complete invoice', () => {
      const result = service.validateZATCAInvoice({
        zatcaUUID: 'uuid-123',
        zatcaInvoiceCounter: 1,
        invoiceType: 'simplified',
        lines: [{ unitPrice: 100, quantity: 1, taxRate: 15 }],
      } as any);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const result = service.validateZATCAInvoice({} as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ZATCA UUID is required');
      expect(result.errors).toContain('ZATCA invoice counter is required');
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject invalid invoice type', () => {
      const result = service.validateZATCAInvoice({
        zatcaUUID: 'uuid',
        zatcaInvoiceCounter: 1,
        invoiceType: 'invalid',
        lines: [{ unitPrice: 1, quantity: 1, taxRate: 15 }],
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invoice type must be standard or simplified');
    });

    it('should reject empty lines array', () => {
      const result = service.validateZATCAInvoice({
        zatcaUUID: 'uuid',
        zatcaInvoiceCounter: 1,
        invoiceType: 'standard',
        lines: [],
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invoice must have at least one line');
    });
  });

  // ─── calculateGOSI() ─────────────────────────────────────────────────

  describe('calculateGOSI()', () => {
    it('should calculate Saudi GOSI: 9.75% employee + 1.25% employer', () => {
      const result = service.calculateGOSI(5000, 2500, true);

      // Base = 5000 + 2500 = 7500
      // Employee = 7500 * 9.75% = 731.25
      // Employer = 7500 * 1.25% = 93.75
      expect(result.employeeContribution.toNumber()).toBe(731.25);
      expect(result.employerContribution.toNumber()).toBe(93.75);
      expect(result.totalContribution.toNumber()).toBe(825);
    });

    it('should calculate non-Saudi GOSI: 0% employee + 2% employer', () => {
      const result = service.calculateGOSI(5000, 2500, false);

      expect(result.employeeContribution.toNumber()).toBe(0);
      expect(result.employerContribution.toNumber()).toBe(150); // 7500 * 2%
      expect(result.totalContribution.toNumber()).toBe(150);
    });
  });

  // ─── calculateOvertime() ──────────────────────────────────────────────

  describe('calculateOvertime()', () => {
    it('should calculate regular overtime at 1.5x hourly rate', () => {
      // hourlyRate = 6000 / 30 / 8 = 25
      const result = service.calculateOvertime(6000, 10, 0);

      // regular = 25 * 1.5 * 10 = 375
      expect(result.regularAmount.toNumber()).toBe(375);
      expect(result.holidayAmount.toNumber()).toBe(0);
      expect(result.totalOvertime.toNumber()).toBe(375);
    });

    it('should calculate holiday overtime at 2x hourly rate', () => {
      const result = service.calculateOvertime(6000, 0, 8);

      // holiday = 25 * 2 * 8 = 400
      expect(result.holidayAmount.toNumber()).toBe(400);
      expect(result.totalOvertime.toNumber()).toBe(400);
    });

    it('should sum regular and holiday overtime', () => {
      const result = service.calculateOvertime(6000, 10, 8);

      expect(result.totalOvertime.toNumber()).toBe(775); // 375 + 400
    });

    it('should return zero overtime for zero hours', () => {
      const result = service.calculateOvertime(6000, 0, 0);

      expect(result.totalOvertime.toNumber()).toBe(0);
    });
  });

  // ─── calculateEndOfService() ──────────────────────────────────────────

  describe('calculateEndOfService()', () => {
    it('should return 0 for <= 0 years of service', () => {
      const result = service.calculateEndOfService(5000, 2500, 0);

      expect(result.entitlement.toNumber()).toBe(0);
    });

    it('should calculate 0.5 month per year for first 5 years', () => {
      // monthly = 5000 + 2500 = 7500
      // 3 years: 7500 * 0.5 * 3 = 11250
      const result = service.calculateEndOfService(5000, 2500, 3);

      expect(result.entitlement.toNumber()).toBe(11250);
    });

    it('should calculate exactly 5 years: 0.5 * 5 = 2.5 months', () => {
      const result = service.calculateEndOfService(5000, 2500, 5);

      // 7500 * 0.5 * 5 = 18750
      expect(result.entitlement.toNumber()).toBe(18750);
    });

    it('should calculate > 5 years with mixed formula', () => {
      // monthly = 7500
      // First 5 years: 7500 * 2.5 = 18750
      // Remaining 3 years: 7500 * 3 = 22500
      // Total = 41250
      const result = service.calculateEndOfService(5000, 2500, 8);

      expect(result.entitlement.toNumber()).toBe(41250);
    });
  });

  // ─── calculateNetSalary() ─────────────────────────────────────────────

  describe('calculateNetSalary()', () => {
    it('should calculate net = gross + overtime - deductions', () => {
      const result = service.calculateNetSalary({
        grossSalary: 10000,
        overtimeAmount: 500,
        gosiEmployeeContribution: 731.25,
        otherDeductions: 200,
      });

      // 10000 + 500 - 731.25 - 200 = 9568.75
      expect(result.toNumber()).toBe(9568.75);
    });

    it('should handle no overtime and no other deductions', () => {
      const result = service.calculateNetSalary({
        grossSalary: 10000,
        gosiEmployeeContribution: 500,
      });

      expect(result.toNumber()).toBe(9500);
    });
  });

  // ─── buildPayslipBreakdown() ──────────────────────────────────────────

  describe('buildPayslipBreakdown()', () => {
    it('should build complete payslip for Saudi employee', () => {
      const result = service.buildPayslipBreakdown({
        basicSalary: 5000,
        housingAllowance: 2500,
        transportationAllowance: 500,
        otherAllowances: 0,
        overtimeAmount: 375,
        isSaudi: true,
        otherDeductions: 0,
      });

      expect(result.grossSalary.toNumber()).toBe(8000);
      expect(result.gosiEmployee.toNumber()).toBe(731.25); // (5000+2500)*9.75%
      expect(result.deductions.toNumber()).toBe(731.25);
      // net = 8000 + 375 - 731.25 = 7643.75
      expect(result.netSalary.toNumber()).toBe(7643.75);
    });

    it('should build payslip for non-Saudi employee (no GOSI deduction)', () => {
      const result = service.buildPayslipBreakdown({
        basicSalary: 5000,
        housingAllowance: 2500,
        isSaudi: false,
      });

      expect(result.gosiEmployee.toNumber()).toBe(0);
      expect(result.grossSalary.toNumber()).toBe(7500);
      expect(result.netSalary.toNumber()).toBe(7500);
    });
  });

  // ─── applyDiscounts() ─────────────────────────────────────────────────

  describe('applyDiscounts()', () => {
    it('should apply a single percentage discount', () => {
      const result = service.applyDiscounts(200, [{ type: 'percentage', value: 10 }]);

      expect(result.discountAmount.toNumber()).toBe(20);
      expect(result.finalAmount.toNumber()).toBe(180);
    });

    it('should apply a single fixed discount', () => {
      const result = service.applyDiscounts(200, [{ type: 'fixed', value: 50 }]);

      expect(result.discountAmount.toNumber()).toBe(50);
      expect(result.finalAmount.toNumber()).toBe(150);
    });

    it('should apply compound discounts sequentially', () => {
      const result = service.applyDiscounts(1000, [
        { type: 'percentage', value: 10 }, // 1000 -> 900
        { type: 'fixed', value: 50 }, // 900 -> 850
      ]);

      expect(result.discountAmount.toNumber()).toBe(150);
      expect(result.finalAmount.toNumber()).toBe(850);
    });

    it('should cap fixed discount at remaining amount', () => {
      const result = service.applyDiscounts(100, [{ type: 'fixed', value: 200 }]);

      expect(result.discountAmount.toNumber()).toBe(100);
      expect(result.finalAmount.toNumber()).toBe(0);
    });

    it('should handle no discounts', () => {
      const result = service.applyDiscounts(500, []);

      expect(result.discountAmount.toNumber()).toBe(0);
      expect(result.finalAmount.toNumber()).toBe(500);
    });
  });

  // ─── Precision arithmetic helpers ─────────────────────────────────────

  describe('precision arithmetic', () => {
    it('add() should avoid floating point issues', () => {
      expect(service.add(0.1, 0.2)).toBe(0.3);
    });

    it('subtract() should avoid floating point issues', () => {
      expect(service.subtract(0.3, 0.1)).toBe(0.2);
    });

    it('multiply() should be precise', () => {
      expect(service.multiply(0.1, 0.2)).toBe(0.02);
    });

    it('divide() should be precise', () => {
      expect(service.divide(1, 3)).toBeCloseTo(0.3333333333, 9);
    });

    it('roundHalfUp() should round to 2 decimals by default', () => {
      expect(service.roundHalfUp(1.235)).toBe(1.24);
      expect(service.roundHalfUp(1.234)).toBe(1.23);
    });

    it('roundHalfUp() should round to specified decimals', () => {
      expect(service.roundHalfUp(1.23456, 4)).toBe(1.2346);
    });
  });
});
