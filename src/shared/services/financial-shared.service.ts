import { Injectable } from '@nestjs/common';
import { DecimalUtil } from '@/common/utils/math/decimal.util';
import {
  InvoiceUtil,
  InvoiceLine,
  InvoiceTotals,
  ZATCAInvoiceLine,
} from '@/common/utils/financial/invoice.util';
import {
  PayrollUtil,
  GrossSalaryParams,
  GOSIResult,
  OvertimeResult,
  EndOfServiceResult,
  PayslipBreakdown,
} from '@/common/utils/financial/payroll.util';
import { DiscountUtil, DiscountResult } from '@/common/utils/financial/discount.util';
import Decimal from 'decimal.js';

@Injectable()
export class FinancialSharedService {
  // Invoice
  calculateInvoiceTotals(lines: InvoiceLine[]): InvoiceTotals {
    return InvoiceUtil.calculateInvoiceTotals(lines);
  }

  buildZATCAInvoiceLine(line: InvoiceLine): ZATCAInvoiceLine {
    return InvoiceUtil.buildZATCAInvoiceLine(
      line.unitPrice,
      line.quantity,
      line.discountAmount ?? 0,
      line.taxRate,
    );
  }

  validateZATCAInvoice(totals: InvoiceTotals): { valid: boolean; errors: string[] } {
    return InvoiceUtil.validateZATCAInvoice(totals as any);
  }

  // Payroll
  calculateGrossSalary(params: GrossSalaryParams): Decimal {
    return PayrollUtil.calculateGrossSalary(params);
  }

  calculateGOSI(basicSalary: number, housingAllowance: number, isSaudi: boolean): GOSIResult {
    return PayrollUtil.calculateGOSI(basicSalary, housingAllowance, isSaudi);
  }

  calculateOvertime(
    basicSalary: number,
    regularHours: number,
    holidayHours: number,
  ): OvertimeResult {
    return PayrollUtil.calculateOvertime(basicSalary, regularHours, holidayHours);
  }

  calculateEndOfService(
    basicSalary: number,
    housingAllowance: number,
    yearsOfService: number,
  ): EndOfServiceResult {
    return PayrollUtil.calculateEndOfService(basicSalary, housingAllowance, yearsOfService);
  }

  calculateNetSalary(params: {
    grossSalary: number;
    overtimeAmount?: number;
    gosiEmployeeContribution: number;
    otherDeductions?: number;
  }): Decimal {
    return PayrollUtil.calculateNetSalary(params);
  }

  buildPayslipBreakdown(params: {
    basicSalary: number;
    housingAllowance: number;
    transportationAllowance?: number;
    otherAllowances?: number;
    overtimeAmount?: number;
    isSaudi: boolean;
    otherDeductions?: number;
  }): PayslipBreakdown {
    return PayrollUtil.buildPayslipBreakdown(params);
  }

  // Discounts
  applyDiscounts(
    amount: number,
    discounts: { type: 'percentage' | 'fixed'; value: number }[],
  ): DiscountResult {
    return DiscountUtil.applyDiscounts(amount, discounts);
  }

  // Precision arithmetic
  add(a: number, b: number): number {
    return DecimalUtil.toNumber(DecimalUtil.add(a, b));
  }

  subtract(a: number, b: number): number {
    return DecimalUtil.toNumber(DecimalUtil.subtract(a, b));
  }

  multiply(a: number, b: number): number {
    return DecimalUtil.toNumber(DecimalUtil.multiply(a, b));
  }

  divide(a: number, b: number): number {
    return DecimalUtil.toNumber(DecimalUtil.divide(a, b));
  }

  roundHalfUp(value: number, decimals = 2): number {
    return DecimalUtil.toNumber(DecimalUtil.roundHalfUp(value, decimals));
  }
}
