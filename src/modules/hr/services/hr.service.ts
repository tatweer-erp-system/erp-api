import { Injectable } from '@nestjs/common';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { DepartmentsRepository } from '@/database/sql/repositories/departments.repository';
import { EmployeeContractsRepository } from '@/database/sql/repositories/employee-contracts.repository';
import { LeaveTypesRepository } from '@/database/sql/repositories/leave-types.repository';
import { LeaveRequestsRepository } from '@/database/sql/repositories/leave-requests.repository';
import { LeaveAllocationsRepository } from '@/database/sql/repositories/leave-allocations.repository';
import { AttendanceRecordsRepository } from '@/database/sql/repositories/attendance-records.repository';
import { Employee } from '@/database/sql/entities/employee.entity';
import { Department } from '@/database/sql/entities/department.entity';
import { EmployeeContract } from '@/database/sql/entities/employee-contract.entity';
import { LeaveType } from '@/database/sql/entities/leave-type.entity';
import { LeaveRequest } from '@/database/sql/entities/leave-request.entity';
import { LeaveAllocation } from '@/database/sql/entities/leave-allocation.entity';
import { AttendanceRecord } from '@/database/sql/entities/attendance-record.entity';
import {
  ContractStatus,
  LeaveRequestStatus,
  LeaveAllocationStatus,
  AttendanceStatus,
} from '@/common/enums/hr.enums';

@Injectable()
export class HrService {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly contractsRepo: EmployeeContractsRepository,
    private readonly leaveTypesRepo: LeaveTypesRepository,
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly leaveAllocationsRepo: LeaveAllocationsRepository,
    private readonly attendanceRepo: AttendanceRecordsRepository,
  ) {}

  // ── Employees ──────────────────────────────────────────────────────────────

  findAllEmployees(
    branchId: string,
    filters: { search?: string; departmentId?: string; isActive?: boolean },
    page: number,
    limit: number,
  ) {
    return this.employeesRepo.findAll(branchId, filters, page, limit);
  }

  findEmployeeById(id: string): Promise<Employee> {
    return this.employeesRepo.findById(id);
  }

  createEmployee(data: Partial<Employee>): Promise<Employee> {
    return this.employeesRepo.create(data);
  }

  updateEmployee(id: string, version: number, data: Partial<Employee>): Promise<Employee> {
    return this.employeesRepo.update(id, version, data);
  }

  deleteEmployee(id: string): Promise<void> {
    return this.employeesRepo.softDelete(id);
  }

  getEmployeesDropdown(branchId: string) {
    return this.employeesRepo.findForDropdown(branchId);
  }

  // ── Departments ────────────────────────────────────────────────────────────

  findAllDepartments(
    filters: { search?: string; isActive?: boolean },
    page: number,
    limit: number,
  ) {
    return this.departmentsRepo.findAll(filters, page, limit);
  }

  findDepartmentById(id: string): Promise<Department> {
    return this.departmentsRepo.findById(id);
  }

  createDepartment(data: Partial<Department>): Promise<Department> {
    return this.departmentsRepo.create(data);
  }

  updateDepartment(id: string, version: number, data: Partial<Department>): Promise<Department> {
    return this.departmentsRepo.update(id, version, data);
  }

  deleteDepartment(id: string): Promise<void> {
    return this.departmentsRepo.softDelete(id);
  }

  getDepartmentsDropdown() {
    return this.departmentsRepo.findForDropdown();
  }

  // ── Employee Contracts ─────────────────────────────────────────────────────

  findAllContracts(
    branchId: string,
    filters: { employeeId?: string; status?: ContractStatus },
    page: number,
    limit: number,
  ) {
    return this.contractsRepo.findAll(branchId, filters, page, limit);
  }

  findContractById(id: string): Promise<EmployeeContract> {
    return this.contractsRepo.findById(id);
  }

  findActiveContract(employeeId: string): Promise<EmployeeContract | null> {
    return this.contractsRepo.findActive(employeeId);
  }

  createContract(data: Partial<EmployeeContract>): Promise<EmployeeContract> {
    return this.contractsRepo.create(data);
  }

  updateContract(
    id: string,
    version: number,
    data: Partial<EmployeeContract>,
  ): Promise<EmployeeContract> {
    return this.contractsRepo.update(id, version, data);
  }

  deleteContract(id: string): Promise<void> {
    return this.contractsRepo.softDelete(id);
  }

  // ── Leave Types ────────────────────────────────────────────────────────────

  findAllLeaveTypes(isActive?: boolean) {
    return this.leaveTypesRepo.findAll(isActive);
  }

  findLeaveTypeById(id: string): Promise<LeaveType> {
    return this.leaveTypesRepo.findById(id);
  }

  createLeaveType(data: Partial<LeaveType>): Promise<LeaveType> {
    return this.leaveTypesRepo.create(data);
  }

  updateLeaveType(id: string, version: number, data: Partial<LeaveType>): Promise<LeaveType> {
    return this.leaveTypesRepo.update(id, version, data);
  }

  deleteLeaveType(id: string): Promise<void> {
    return this.leaveTypesRepo.softDelete(id);
  }

  getLeaveTypesDropdown() {
    return this.leaveTypesRepo.findForDropdown();
  }

  // ── Leave Requests ─────────────────────────────────────────────────────────

  findAllLeaveRequests(
    branchId: string,
    filters: {
      employeeId?: string;
      leaveTypeId?: string;
      status?: LeaveRequestStatus;
      year?: number;
    },
    page: number,
    limit: number,
  ) {
    return this.leaveRequestsRepo.findAll(branchId, filters, page, limit);
  }

  findLeaveRequestById(id: string): Promise<LeaveRequest> {
    return this.leaveRequestsRepo.findById(id);
  }

  createLeaveRequest(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    return this.leaveRequestsRepo.create(data);
  }

  updateLeaveRequest(
    id: string,
    version: number,
    data: Partial<LeaveRequest>,
  ): Promise<LeaveRequest> {
    return this.leaveRequestsRepo.update(id, version, data);
  }

  approveLeaveRequest(id: string, approvedById: string): Promise<LeaveRequest> {
    return this.leaveRequestsRepo.approve(id, approvedById);
  }

  refuseLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
    return this.leaveRequestsRepo.refuse(id, reason);
  }

  cancelLeaveRequest(id: string): Promise<LeaveRequest> {
    return this.leaveRequestsRepo.cancel(id);
  }

  deleteLeaveRequest(id: string): Promise<void> {
    return this.leaveRequestsRepo.softDelete(id);
  }

  // ── Leave Allocations ──────────────────────────────────────────────────────

  findAllLeaveAllocations(
    branchId: string,
    filters: {
      employeeId?: string;
      leaveTypeId?: string;
      year?: number;
      status?: LeaveAllocationStatus;
    },
    page: number,
    limit: number,
  ) {
    return this.leaveAllocationsRepo.findAll(branchId, filters, page, limit);
  }

  findLeaveAllocationById(id: string): Promise<LeaveAllocation> {
    return this.leaveAllocationsRepo.findById(id);
  }

  createLeaveAllocation(data: Partial<LeaveAllocation>): Promise<LeaveAllocation> {
    return this.leaveAllocationsRepo.create(data);
  }

  updateLeaveAllocation(
    id: string,
    version: number,
    data: Partial<LeaveAllocation>,
  ): Promise<LeaveAllocation> {
    return this.leaveAllocationsRepo.update(id, version, data);
  }

  approveLeaveAllocation(id: string, approvedById: string): Promise<LeaveAllocation> {
    return this.leaveAllocationsRepo.approve(id, approvedById);
  }

  refuseLeaveAllocation(id: string): Promise<LeaveAllocation> {
    return this.leaveAllocationsRepo.refuse(id);
  }

  deleteLeaveAllocation(id: string): Promise<void> {
    return this.leaveAllocationsRepo.softDelete(id);
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  findAllAttendance(
    branchId: string,
    filters: {
      employeeId?: string;
      date?: string;
      month?: number;
      year?: number;
      status?: AttendanceStatus;
    },
    page: number,
    limit: number,
  ) {
    return this.attendanceRepo.findAll(branchId, filters, page, limit);
  }

  findAttendanceById(id: string): Promise<AttendanceRecord> {
    return this.attendanceRepo.findById(id);
  }

  createAttendance(data: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    return this.attendanceRepo.create(data);
  }

  updateAttendance(
    id: string,
    version: number,
    data: Partial<AttendanceRecord>,
  ): Promise<AttendanceRecord> {
    return this.attendanceRepo.update(id, version, data);
  }

  deleteAttendance(id: string): Promise<void> {
    return this.attendanceRepo.softDelete(id);
  }

  checkIn(employeeId: string, branchId: string): Promise<AttendanceRecord> {
    return this.attendanceRepo.checkIn(employeeId, branchId);
  }

  checkOut(employeeId: string, branchId: string): Promise<AttendanceRecord> {
    return this.attendanceRepo.checkOut(employeeId, branchId);
  }
}
