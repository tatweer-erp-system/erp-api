import { EmploymentStatus, EmploymentType, LeaveStatus } from '@/common/enums/hr.enums';
export { EmploymentStatus, EmploymentType, LeaveStatus };

export interface CreateEmployeeData {
  userId: string;
  nameEn: string;
  nameAr: string;
  employeeCode?: string | null;
  departmentId?: string | null;
  jobPositionId?: string | null;
  branchId?: string | null;
  employmentType?: string;
  hireDate: string;
  terminationDate?: string | null;
  employeeNumber?: string | null;
  managerId?: string | null;
  nationalId?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  isSaudi?: boolean;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  createdBy?: string | null;
}

export interface CreateLeaveRequestData {
  employeeId: string;
  leaveTypeId: string;
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
