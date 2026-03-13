export enum EmploymentStatus {
  ACTIVE = 'active',
  PROBATION = 'probation',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export enum EmploymentType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  PERSONAL = 'personal',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  EMERGENCY = 'emergency',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum AttendanceSource {
  MANUAL = 'manual',
  DEVICE = 'device',
  IMPORT = 'import',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
}

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

export enum ContractType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  TEMPORARY = 'temporary',
  SEASONAL = 'seasonal',
}

export enum ContractStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum SalaryBasis {
  ACTUAL_DAYS = 'actualDays',
  FIXED_30 = 'fixed30',
}
