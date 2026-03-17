/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmploymentType, ContractStatus } from '@/common/enums/hr.enums';

// Mock all repository/service imports to prevent entity imports (which pull in uuid ESM)
jest.mock('@/database/sql/repositories/employees.repository', () => ({
  EmployeesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/employee-contracts.repository', () => ({
  EmployeeContractsRepository: jest.fn(),
}));
jest.mock('@/shared/services/audit-shared.service', () => ({
  AuditSharedService: jest.fn(),
}));
jest.mock('@/shared/services/outbox-shared.service', () => ({
  OutboxSharedService: jest.fn(),
}));
jest.mock('@/modules/sequences/services/sequences.service', () => ({
  SequencesService: jest.fn(),
}));

import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeesRepository: Record<string, jest.Mock>;
  let contractsRepository: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const employeeId = 'emp-1';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockEmployee = {
    id: employeeId,
    nameEn: 'John Doe',
    nameAr: 'جون دو',
    employeeCode: null,
    departmentId: 'dept-1',
    jobPositionId: 'job-1',
    branchId: 'branch-1',
    employmentType: EmploymentType.FULL_TIME,
    hireDate: '2025-01-01',
    employeeNumber: 'EMP-00001',
    managerId: null,
    nationalId: '1234567890',
    birthDate: null,
    gender: null,
    maritalStatus: null,
    nationality: 'SA',
    isSaudi: true,
    emergencyContact: null,
    emergencyPhone: null,
    bankAccount: null,
    bankName: null,
    version: 1,
  };

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  beforeEach(() => {
    employeesRepository = {
      findOneById: jest.fn(),
      insertEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      softDeleteEmployee: jest.fn(),
      restoreEmployee: jest.fn(),
      findAllPaginated: jest.fn(),
      findDropdown: jest.fn(),
      findByDepartmentPaginated: jest.fn(),
      getSequelize: jest.fn().mockReturnValue({
        transaction: jest.fn().mockResolvedValue(mockTransaction),
      }),
    };

    contractsRepository = {
      findActiveByEmployee: jest.fn(),
    };

    auditService = {
      logCreate: jest.fn(),
      logUpdate: jest.fn(),
      logDelete: jest.fn(),
    };

    outboxService = {
      createEvent: jest.fn(),
    };

    sequencesService = {
      nextNumber: jest.fn(),
    };

    service = new EmployeesService(
      employeesRepository as any,
      contractsRepository as any,
      auditService as any,
      outboxService as any,
      sequencesService as any,
    );
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      nameEn: 'John Doe',
      nameAr: 'جون دو',
      departmentId: 'dept-1',
      jobPositionId: 'job-1',
      branchId: 'branch-1',
      userId: 'user-new',
      hireDate: '2025-01-01',
      isSaudi: true,
    };

    it('should create an employee with nameEn/nameAr and jobPositionId', async () => {
      sequencesService.nextNumber.mockResolvedValue('EMP-00001');
      employeesRepository.insertEmployee.mockResolvedValue(employeeId);
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      const result = await service.create(tenantId, createDto as any, auditContext);

      expect(employeesRepository.insertEmployee).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          nameEn: 'John Doe',
          nameAr: 'جون دو',
          jobPositionId: 'job-1',
        }),
      );
      expect(result.nameEn).toBe('John Doe');
      expect(result.nameAr).toBe('جون دو');
    });

    it('should generate employeeNumber via SequencesService', async () => {
      sequencesService.nextNumber.mockResolvedValue('EMP-00042');
      employeesRepository.insertEmployee.mockResolvedValue(employeeId);
      employeesRepository.findOneById.mockResolvedValue({
        ...mockEmployee,
        employeeNumber: 'EMP-00042',
      });

      await service.create(tenantId, createDto as any, auditContext);

      expect(sequencesService.nextNumber).toHaveBeenCalledWith(tenantId, 'employee', 'branch-1');
      expect(employeesRepository.insertEmployee).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ employeeNumber: 'EMP-00042' }),
      );
    });

    it('should default employmentType to FULL_TIME when not provided', async () => {
      sequencesService.nextNumber.mockResolvedValue('EMP-00001');
      employeesRepository.insertEmployee.mockResolvedValue(employeeId);
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      const dtoWithoutType = { ...createDto };
      delete (dtoWithoutType as any).employmentType;

      await service.create(tenantId, dtoWithoutType as any, auditContext);

      expect(employeesRepository.insertEmployee).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ employmentType: EmploymentType.FULL_TIME }),
      );
    });

    it('should call auditService.logCreate with masked sensitive fields', async () => {
      sequencesService.nextNumber.mockResolvedValue('EMP-00001');
      employeesRepository.insertEmployee.mockResolvedValue(employeeId);
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      await service.create(tenantId, createDto as any, auditContext);

      expect(auditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'hr.employees',
        employeeId,
        expect.objectContaining({ nationalId: '***', bankAccount: '***' }),
        userId,
      );
    });

    it('should create outbox event employee.created', async () => {
      sequencesService.nextNumber.mockResolvedValue('EMP-00001');
      employeesRepository.insertEmployee.mockResolvedValue(employeeId);
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      await service.create(tenantId, createDto as any, auditContext);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          eventType: 'employee.created',
          payload: expect.objectContaining({
            employeeId,
            employeeNumber: 'EMP-00001',
          }),
        }),
      );
    });

    it('should not include salary fields in employee creation (salary is on contract)', async () => {
      sequencesService.nextNumber.mockResolvedValue('EMP-00001');
      employeesRepository.insertEmployee.mockResolvedValue(employeeId);
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      await service.create(tenantId, createDto as any, auditContext);

      const insertCall = employeesRepository.insertEmployee.mock.calls[0][1];
      expect(insertCall).not.toHaveProperty('basicSalary');
      expect(insertCall).not.toHaveProperty('housingAllowance');
      expect(insertCall).not.toHaveProperty('transportationAllowance');
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return employee with activeContract computed field when contract exists', async () => {
      const activeContract = {
        id: 'contract-1',
        basicSalary: 10000,
        housingAllowance: 2500,
        transportationAllowance: 500,
        wageType: 'monthly',
        wage: 10000,
        salaryStructureId: 'struct-1',
        workingScheduleId: 'sched-1',
      };
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(activeContract);

      const result = await service.findById(tenantId, employeeId);

      expect(result.activeContract).toEqual({
        id: 'contract-1',
        basicSalary: 10000,
        housingAllowance: 2500,
        transportationAllowance: 500,
        wageType: 'monthly',
        wage: 10000,
        salaryStructureId: 'struct-1',
        workingScheduleId: 'sched-1',
      });
    });

    it('should return activeContract as null when no active contract', async () => {
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(null);

      const result = await service.findById(tenantId, employeeId);

      expect(result.activeContract).toBeNull();
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeesRepository.findOneById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update employee successfully with version check', async () => {
      const updatedEmployee = { ...mockEmployee, nameEn: 'Jane Doe', version: 2 };
      employeesRepository.findOneById
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce(updatedEmployee);
      employeesRepository.updateEmployee.mockResolvedValue(undefined);

      const result = await service.update(
        tenantId,
        employeeId,
        { nameEn: 'Jane Doe', version: 1 } as any,
        auditContext,
      );

      expect(employeesRepository.updateEmployee).toHaveBeenCalled();
      expect(result.nameEn).toBe('Jane Doe');
    });

    it('should throw ConflictException on version mismatch', async () => {
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      await expect(
        service.update(tenantId, employeeId, { nameEn: 'X', version: 0 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeesRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, employeeId, { nameEn: 'X', version: 1 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle department change', async () => {
      const dto = { departmentId: 'dept-2', version: 1 };
      const updated = { ...mockEmployee, departmentId: 'dept-2', version: 2 };
      employeesRepository.findOneById
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce(updated);
      employeesRepository.updateEmployee.mockResolvedValue(undefined);

      const result = await service.update(tenantId, employeeId, dto as any, auditContext);

      expect(result.departmentId).toBe('dept-2');
    });

    it('should call auditService.logUpdate with masked sensitive fields', async () => {
      employeesRepository.findOneById
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce({ ...mockEmployee, nameEn: 'Updated', version: 2 });
      employeesRepository.updateEmployee.mockResolvedValue(undefined);

      await service.update(
        tenantId,
        employeeId,
        { nameEn: 'Updated', version: 1 } as any,
        auditContext,
      );

      expect(auditService.logUpdate).toHaveBeenCalledWith(
        tenantId,
        'hr.employees',
        employeeId,
        expect.objectContaining({ nationalId: '***', bankAccount: '***' }),
        expect.objectContaining({ nationalId: '***', bankAccount: '***' }),
        userId,
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft delete an employee', async () => {
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      await service.remove(tenantId, employeeId, auditContext);

      expect(employeesRepository.softDeleteEmployee).toHaveBeenCalledWith(
        tenantId,
        employeeId,
        userId,
      );
      expect(auditService.logDelete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when removing nonexistent employee', async () => {
      employeesRepository.findOneById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated employees', async () => {
      employeesRepository.findAllPaginated.mockResolvedValue({
        rows: [mockEmployee],
        total: 1,
      });

      const result = await service.findAll(tenantId, { page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });
  });

  // ── restore ────────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('should restore a soft-deleted employee', async () => {
      employeesRepository.restoreEmployee.mockResolvedValue(undefined);
      employeesRepository.findOneById.mockResolvedValue(mockEmployee);

      const result = await service.restore(tenantId, employeeId, auditContext);

      expect(employeesRepository.restoreEmployee).toHaveBeenCalledWith(tenantId, employeeId);
      expect(auditService.logUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });
  });
});
