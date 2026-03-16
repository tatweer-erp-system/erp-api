export enum WageType {
  MONTHLY = 'monthly',
  DAILY = 'daily',
  HOURLY = 'hourly',
}

export enum ContractStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum LeaveAllocationMode {
  FIXED = 'fixed',
  ACCRUAL = 'accrual',
  NO_LIMIT = 'no_limit',
}

export enum LeaveRequestStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  APPROVED = 'approved',
  REFUSED = 'refused',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum LeaveAllocationStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REFUSED = 'refused',
}

export enum HalfDayTime {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
}

// Re-export Gender and MaritalStatus from auth.enums for convenience
export { Gender, MaritalStatus } from './auth.enums';

export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
  SUSPENDED = 'suspended',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

export enum ContractType {
  OPEN_ENDED = 'open_ended',
  FIXED_TERM = 'fixed_term',
  PART_TIME = 'part_time',
  FULL_TIME = 'full_time',
  FREELANCE = 'freelance',
}

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  COMPASSIONATE = 'compassionate',
  OTHER = 'other',
}

// Alias for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
export const LeaveStatus = LeaveRequestStatus;
export type LeaveStatus = LeaveRequestStatus;

export enum AttendanceSource {
  MANUAL = 'manual',
  FINGERPRINT = 'fingerprint',
  MOBILE = 'mobile',
  IMPORT = 'import',
}

export enum TrainingStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TrainingType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  ONLINE = 'online',
}

// Legacy enums kept for payroll module compatibility
export enum PayrollStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  APPROVED = 'approved',
  PAID = 'paid',
}

export enum PayrollItemType {
  BASIC = 'basic',
  ALLOWANCE = 'allowance',
  DEDUCTION = 'deduction',
  BONUS = 'bonus',
  OVERTIME = 'overtime',
  GOSI = 'gosi',
  ADVANCE = 'advance',
}

export enum SalaryBasis {
  ACTUAL_DAYS = 'actualDays',
  FIXED_30 = 'fixed30',
}

export enum SalaryRuleCategory {
  BASIC = 'basic',
  ALLOWANCE = 'allowance',
  DEDUCTION = 'deduction',
  GROSS = 'gross',
  NET = 'net',
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
