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

export interface LocalizedField {
  en: string;
  ar: string;
}

export interface CreateEmployeeData {
  userId: string;
  departmentId?: string | null;
  position: LocalizedField;
  employmentType?: string;
  hireDate: string;
  terminationDate?: string | null;
  basicSalary?: number | null;
  housingAllowance?: number | null;
  transportationAllowance?: number | null;
  salaryCurrency?: string;
  employeeNumber?: string | null;
  managerId?: string | null;
  nationality?: string | null;
  isSaudi?: boolean;
  createdBy?: string | null;
}

export interface CreateLeaveRequestData {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string | null;
  createdBy?: string | null;
}
