import { EmploymentStatus, EmploymentType, LeaveType, LeaveStatus } from '@/common/enums/hr.enums';
export { EmploymentStatus, EmploymentType, LeaveType, LeaveStatus };

export interface CreateEmployeeData {
  userId: string;
  departmentId?: string | null;
  positionEn: string;
  positionAr: string;
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

export interface PayrollJobData {
  tenantSlug: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  processedBy: string;
}
