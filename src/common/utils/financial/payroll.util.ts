import Decimal from 'decimal.js';
import { DecimalUtil } from '../math/decimal.util';

/** GOSI rates per Saudi Labor Law */
const GOSI_SAUDI_EMPLOYEE_RATE = 9.75;
const GOSI_SAUDI_EMPLOYER_RATE = 1.25;
const GOSI_EXPAT_EMPLOYER_RATE = 2;

/** Overtime multipliers */
const OVERTIME_REGULAR_MULTIPLIER = 1.5;
const OVERTIME_HOLIDAY_MULTIPLIER = 2;

export interface GrossSalaryParams {
  basicSalary: number | string | Decimal;
  housingAllowance: number | string | Decimal;
  transportationAllowance?: number | string | Decimal;
  otherAllowances?: number | string | Decimal;
}

export interface GOSIResult {
  employeeContribution: Decimal;
  employerContribution: Decimal;
  totalContribution: Decimal;
}

export interface OvertimeResult {
  regularHours: number;
  holidayHours: number;
  regularAmount: Decimal;
  holidayAmount: Decimal;
  totalOvertime: Decimal;
}

export interface EndOfServiceResult {
  yearsOfService: number;
  entitlement: Decimal;
}

export interface PayslipBreakdown {
  basicSalary: Decimal;
  housingAllowance: Decimal;
  transportationAllowance: Decimal;
  otherAllowances: Decimal;
  grossSalary: Decimal;
  overtime: Decimal;
  gosiEmployee: Decimal;
  deductions: Decimal;
  netSalary: Decimal;
}

export class PayrollUtil {
  /** Calculate gross salary from components */
  static calculateGrossSalary(params: GrossSalaryParams): Decimal {
    return DecimalUtil.roundHalfUp(
      DecimalUtil.add(
        params.basicSalary,
        params.housingAllowance,
        params.transportationAllowance ?? 0,
        params.otherAllowances ?? 0,
      ),
    );
  }

  /**
   * Calculate GOSI contributions
   * Saudi: employee 9.75% + employer 1.25% of (basic + housing)
   * Expat: employer 2% of (basic + housing), no employee contribution
   */
  static calculateGOSI(
    basicSalary: number | string | Decimal,
    housingAllowance: number | string | Decimal,
    isSaudi: boolean,
  ): GOSIResult {
    const gosiBase = DecimalUtil.add(basicSalary, housingAllowance);

    if (isSaudi) {
      const employeeContribution = DecimalUtil.roundHalfUp(
        DecimalUtil.percentage(gosiBase, GOSI_SAUDI_EMPLOYEE_RATE),
      );
      const employerContribution = DecimalUtil.roundHalfUp(
        DecimalUtil.percentage(gosiBase, GOSI_SAUDI_EMPLOYER_RATE),
      );
      return {
        employeeContribution,
        employerContribution,
        totalContribution: DecimalUtil.roundHalfUp(
          DecimalUtil.add(employeeContribution, employerContribution),
        ),
      };
    }

    const employerContribution = DecimalUtil.roundHalfUp(
      DecimalUtil.percentage(gosiBase, GOSI_EXPAT_EMPLOYER_RATE),
    );
    return {
      employeeContribution: DecimalUtil.toDecimal(0),
      employerContribution,
      totalContribution: employerContribution,
    };
  }

  /**
   * Calculate overtime pay
   * Regular overtime: hourly rate * 1.5
   * Holiday overtime: hourly rate * 2
   * Hourly rate = basicSalary / 30 / 8
   */
  static calculateOvertime(
    basicSalary: number | string | Decimal,
    regularHours: number,
    holidayHours: number,
  ): OvertimeResult {
    const hourlyRate = DecimalUtil.divide(DecimalUtil.divide(basicSalary, 30), 8);

    const regularAmount = DecimalUtil.roundHalfUp(
      DecimalUtil.multiply(
        DecimalUtil.multiply(hourlyRate, OVERTIME_REGULAR_MULTIPLIER),
        regularHours,
      ),
    );
    const holidayAmount = DecimalUtil.roundHalfUp(
      DecimalUtil.multiply(
        DecimalUtil.multiply(hourlyRate, OVERTIME_HOLIDAY_MULTIPLIER),
        holidayHours,
      ),
    );

    return {
      regularHours,
      holidayHours,
      regularAmount,
      holidayAmount,
      totalOvertime: DecimalUtil.roundHalfUp(DecimalUtil.add(regularAmount, holidayAmount)),
    };
  }

  /**
   * Calculate end of service (gratuity) per Saudi Labor Law
   * First 5 years: 0.5 month per year
   * After 5 years: 1 month per year
   * Based on last basic salary + housing allowance
   */
  static calculateEndOfService(
    basicSalary: number | string | Decimal,
    housingAllowance: number | string | Decimal,
    yearsOfService: number,
  ): EndOfServiceResult {
    if (yearsOfService <= 0) {
      return { yearsOfService, entitlement: DecimalUtil.toDecimal(0) };
    }

    const monthlySalary = DecimalUtil.add(basicSalary, housingAllowance);
    let entitlement: Decimal;

    if (yearsOfService <= 5) {
      entitlement = DecimalUtil.multiply(DecimalUtil.multiply(monthlySalary, 0.5), yearsOfService);
    } else {
      const firstFiveYears = DecimalUtil.multiply(monthlySalary, 2.5); // 0.5 * 5
      const remainingYears = DecimalUtil.multiply(monthlySalary, yearsOfService - 5);
      entitlement = DecimalUtil.add(firstFiveYears, remainingYears);
    }

    return {
      yearsOfService,
      entitlement: DecimalUtil.roundHalfUp(entitlement),
    };
  }

  /** Calculate net salary with all deductions */
  static calculateNetSalary(params: {
    grossSalary: number | string | Decimal;
    overtimeAmount?: number | string | Decimal;
    gosiEmployeeContribution: number | string | Decimal;
    otherDeductions?: number | string | Decimal;
  }): Decimal {
    const total = DecimalUtil.add(params.grossSalary, params.overtimeAmount ?? 0);
    const deductions = DecimalUtil.add(
      params.gosiEmployeeContribution,
      params.otherDeductions ?? 0,
    );
    return DecimalUtil.roundHalfUp(DecimalUtil.subtract(total, deductions));
  }

  /** Build complete payslip breakdown */
  static buildPayslipBreakdown(params: {
    basicSalary: number | string | Decimal;
    housingAllowance: number | string | Decimal;
    transportationAllowance?: number | string | Decimal;
    otherAllowances?: number | string | Decimal;
    overtimeAmount?: number | string | Decimal;
    isSaudi: boolean;
    otherDeductions?: number | string | Decimal;
  }): PayslipBreakdown {
    const basic = DecimalUtil.toDecimal(params.basicSalary);
    const housing = DecimalUtil.toDecimal(params.housingAllowance);
    const transport = DecimalUtil.toDecimal(params.transportationAllowance ?? 0);
    const other = DecimalUtil.toDecimal(params.otherAllowances ?? 0);
    const overtime = DecimalUtil.toDecimal(params.overtimeAmount ?? 0);

    const grossSalary = DecimalUtil.roundHalfUp(DecimalUtil.add(basic, housing, transport, other));
    const gosi = PayrollUtil.calculateGOSI(basic, housing, params.isSaudi);
    const deductions = DecimalUtil.roundHalfUp(
      DecimalUtil.add(gosi.employeeContribution, params.otherDeductions ?? 0),
    );
    const netSalary = DecimalUtil.roundHalfUp(
      DecimalUtil.subtract(DecimalUtil.add(grossSalary, overtime), deductions),
    );

    return {
      basicSalary: basic,
      housingAllowance: housing,
      transportationAllowance: transport,
      otherAllowances: other,
      grossSalary,
      overtime,
      gosiEmployee: gosi.employeeContribution,
      deductions,
      netSalary,
    };
  }
}
