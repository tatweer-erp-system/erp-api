export enum StructureType {
  EMPLOYEE = 'employee',
  WORKER = 'worker',
  HOURLY = 'hourly',
}

export enum SalaryRuleCategory {
  BASIC = 'basic',
  ALLOWANCE = 'allowance',
  DEDUCTION = 'deduction',
  OTHER = 'other',
}

export enum SalaryRuleComputeType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  CODE = 'code',
}

export enum PayslipStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}
