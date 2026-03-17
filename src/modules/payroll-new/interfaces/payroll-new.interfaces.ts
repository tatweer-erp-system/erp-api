import { SalaryRuleCategory } from '@/common/enums/hr-new.enums';

export interface ComputedPayslipLine {
  code: string;
  nameEn: string;
  nameAr: string;
  category: SalaryRuleCategory;
  sequence: number;
  quantity: number;
  rate: number;
  amount: number;
  appearsOnPayslip: boolean;
  ruleId?: string;
}

export interface PayslipComputeResult {
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  gosiEmployee: number;
  gosiEmployer: number;
  incomeTax: number;
  lines: ComputedPayslipLine[];
}

export interface GeneratePayslipsResult {
  generated: number;
  payslipIds: string[];
}
