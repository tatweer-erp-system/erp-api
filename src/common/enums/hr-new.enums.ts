export enum SalaryStructureType {
  EMPLOYEE = 'employee',
  WORKER = 'worker',
  HOURLY = 'hourly',
}

export enum SalaryRuleCategory {
  BASIC = 'basic',
  ALLOWANCE = 'allowance',
  DEDUCTION = 'deduction',
  GROSS = 'gross',
  NET = 'net',
  OTHER = 'other',
}

export enum SalaryRuleConditionType {
  ALWAYS = 'always',
  PYTHON = 'python',
}

export enum SalaryRuleComputationType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  CODE = 'code',
}

export enum PayslipStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum WageType {
  MONTHLY = 'monthly',
  DAILY = 'daily',
  HOURLY = 'hourly',
}

export enum LeaveAllocationMode {
  MANUAL = 'manual',
  ACCRUAL = 'accrual',
}

export enum LeaveAllocationStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  APPROVED = 'approved',
  REFUSED = 'refused',
}

export enum SalaryCalculationBasis {
  ACTUAL_DAYS = 'actualDays',
  FIXED_30 = 'fixed30',
}
