/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractStatus } from '@/common/enums/hr.enums';
import { WageType } from '@/common/enums/hr-new.enums';

// Mock all repository/service imports
jest.mock('@/database/sql/repositories/employee-contracts.repository', () => ({
  EmployeeContractsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/employees.repository', () => ({
  EmployeesRepository: jest.fn(),
}));
jest.mock('@/shared/services/outbox-shared.service', () => ({
  OutboxSharedService: jest.fn(),
}));

import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let contractsRepository: Record<string, jest.Mock>;
  let employeesRepository: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const contractId = 'contract-1';
  const employeeId = 'emp-1';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockEmployee = {
    id: employeeId,
    nameEn: 'Ahmed',
    nameAr: 'أحمد',
  };

  const mockContract = {
    id: contractId,
    employeeId,
    contractType: 'full_time',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    basicSalary: 10000,
    housingAllowance: 2500,
    transportationAllowance: 500,
    wageType: WageType.MONTHLY,
    wage: 10000,
    salaryStructureId: 'struct-1',
    workingScheduleId: 'sched-1',
    status: ContractStatus.DRAFT,
    notes: null,
  };

  beforeEach(() => {
    contractsRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByIdOrNull: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findActiveByEmployee: jest.fn(),
      findExpiringContracts: jest.fn(),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
      getSequelize: jest.fn().mockReturnValue({
        transaction: jest.fn().mockResolvedValue(mockTransaction),
      }),
    };

    employeesRepository = {
      findByIdOrNull: jest.fn(),
    };

    outboxService = {
      createEvent: jest.fn(),
    };

    service = new ContractsService(
      contractsRepository as any,
      employeesRepository as any,
      outboxService as any,
    );
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      employeeId,
      contractType: 'full_time',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      basicSalary: 10000,
      housingAllowance: 2500,
      transportationAllowance: 500,
      wageType: WageType.MONTHLY,
      wage: 10000,
      salaryStructureId: 'struct-1',
      workingScheduleId: 'sched-1',
    };

    it('should create a contract with salaryStructureId, wageType, wage, workingScheduleId', async () => {
      employeesRepository.findByIdOrNull.mockResolvedValue(mockEmployee);
      contractsRepository.create.mockResolvedValue(mockContract);

      const result = await service.create(tenantId, createDto as any, auditContext);

      expect(contractsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId,
          wageType: WageType.MONTHLY,
          wage: 10000,
          salaryStructureId: 'struct-1',
          workingScheduleId: 'sched-1',
          basicSalary: 10000,
          housingAllowance: 2500,
          transportationAllowance: 500,
        }),
        expect.objectContaining({ tenantId }),
      );
    });

    it('should default status to DRAFT when not provided', async () => {
      employeesRepository.findByIdOrNull.mockResolvedValue(mockEmployee);
      contractsRepository.create.mockResolvedValue(mockContract);

      await service.create(tenantId, createDto as any, auditContext);

      expect(contractsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ContractStatus.DRAFT }),
        expect.any(Object),
      );
    });

    it('should default wageType to MONTHLY when not provided', async () => {
      employeesRepository.findByIdOrNull.mockResolvedValue(mockEmployee);
      contractsRepository.create.mockResolvedValue(mockContract);

      const dtoNoWageType = { ...createDto };
      delete (dtoNoWageType as any).wageType;

      await service.create(tenantId, dtoNoWageType as any, auditContext);

      expect(contractsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ wageType: WageType.MONTHLY }),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeesRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.create(tenantId, createDto as any, auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce one active contract per employee', async () => {
      employeesRepository.findByIdOrNull.mockResolvedValue(mockEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue({ id: 'other-contract' });

      const activeDto = { ...createDto, status: ContractStatus.ACTIVE };

      await expect(service.create(tenantId, activeDto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow creating ACTIVE contract when no other active contract exists', async () => {
      employeesRepository.findByIdOrNull.mockResolvedValue(mockEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(null);
      contractsRepository.create.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACTIVE,
      });

      const activeDto = { ...createDto, status: ContractStatus.ACTIVE };

      const result = await service.create(tenantId, activeDto as any, auditContext);

      expect(result.status).toBe(ContractStatus.ACTIVE);
    });
  });

  // ── Status transitions ─────────────────────────────────────────────────────

  describe('update() — Status transitions', () => {
    beforeEach(() => {
      contractsRepository.findByIdOrNull.mockResolvedValue(mockContract);
    });

    it('should allow transition: Draft → Active', async () => {
      contractsRepository.findActiveByEmployee.mockResolvedValue(null);
      contractsRepository.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACTIVE,
      });

      const result = await service.update(
        tenantId,
        contractId,
        { status: ContractStatus.ACTIVE } as any,
        auditContext,
      );

      expect(result.status).toBe(ContractStatus.ACTIVE);
    });

    it('should allow transition: Draft → Cancelled', async () => {
      contractsRepository.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.CANCELLED,
      });

      const result = await service.update(
        tenantId,
        contractId,
        { status: ContractStatus.CANCELLED } as any,
        auditContext,
      );

      expect(result.status).toBe(ContractStatus.CANCELLED);
    });

    it('should allow transition: Active → Expired', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACTIVE,
      });
      contractsRepository.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.EXPIRED,
      });

      const result = await service.update(
        tenantId,
        contractId,
        { status: ContractStatus.EXPIRED } as any,
        auditContext,
      );

      expect(result.status).toBe(ContractStatus.EXPIRED);
    });

    it('should allow transition: Active → Cancelled', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACTIVE,
      });
      contractsRepository.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.CANCELLED,
      });

      const result = await service.update(
        tenantId,
        contractId,
        { status: ContractStatus.CANCELLED } as any,
        auditContext,
      );

      expect(result.status).toBe(ContractStatus.CANCELLED);
    });

    it('should reject transition: Draft → Expired', async () => {
      await expect(
        service.update(
          tenantId,
          contractId,
          { status: ContractStatus.EXPIRED } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition: Expired → Active', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.EXPIRED,
      });

      await expect(
        service.update(
          tenantId,
          contractId,
          { status: ContractStatus.ACTIVE } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition: Cancelled → Active', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.CANCELLED,
      });

      await expect(
        service.update(
          tenantId,
          contractId,
          { status: ContractStatus.ACTIVE } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition: Expired → Cancelled', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.EXPIRED,
      });

      await expect(
        service.update(
          tenantId,
          contractId,
          { status: ContractStatus.CANCELLED } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── update — Activating when another active exists ─────────────────────────

  describe('update() — One active contract enforcement', () => {
    it('should reject activation when another employee contract is already active', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue(mockContract); // DRAFT
      contractsRepository.findActiveByEmployee.mockResolvedValue({ id: 'other-contract' });

      await expect(
        service.update(
          tenantId,
          contractId,
          { status: ContractStatus.ACTIVE } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return contract when found', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue(mockContract);

      const result = await service.findById(tenantId, contractId);

      expect(result).toEqual(mockContract);
    });

    it('should throw NotFoundException when not found', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft delete a contract', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue(mockContract);

      await service.remove(tenantId, contractId, auditContext);

      expect(contractsRepository.softDelete).toHaveBeenCalledWith(contractId, {
        tenantId,
        auditContext,
      });
    });

    it('should throw NotFoundException when contract not found', async () => {
      contractsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── checkExpiryAlerts ──────────────────────────────────────────────────────

  describe('checkExpiryAlerts()', () => {
    it('should emit outbox events for contracts expiring in 30 and 7 days', async () => {
      const expiringContract = {
        id: 'expiring-1',
        employeeId: 'emp-1',
        endDate: '2026-04-16',
      };
      contractsRepository.findExpiringContracts.mockResolvedValue([expiringContract]);

      await service.checkExpiryAlerts(tenantId);

      // Called for both 30-day and 7-day checks
      expect(contractsRepository.findExpiringContracts).toHaveBeenCalledWith(tenantId, 30);
      expect(contractsRepository.findExpiringContracts).toHaveBeenCalledWith(tenantId, 7);
      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          eventType: 'contract.expiring_soon',
          payload: expect.objectContaining({
            contractId: 'expiring-1',
            employeeId: 'emp-1',
          }),
        }),
      );
    });
  });
});
