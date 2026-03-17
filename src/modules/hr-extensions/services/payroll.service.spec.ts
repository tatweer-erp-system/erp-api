/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayrollStatus, SalaryBasis, ContractStatus } from '@/common/enums/hr.enums';

// Mock all repository/service imports
jest.mock('@/database/sql/repositories/payroll-runs.repository', () => ({
  PayrollRunsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/payroll-items.repository', () => ({
  PayrollItemsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/employees.repository', () => ({
  EmployeesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/employee-contracts.repository', () => ({
  EmployeeContractsRepository: jest.fn(),
}));
jest.mock('@/modules/settings/services/unified-settings.service', () => ({
  UnifiedSettingsService: jest.fn(),
}));
jest.mock('@/shared/services/journal-poster-shared.service', () => ({
  JournalPosterSharedService: jest.fn(),
}));
jest.mock('@/modules/notifications/services/notifications.service', () => ({
  NotificationsService: jest.fn(),
}));

import { PayrollService } from './payroll.service';

describe('PayrollService', () => {
  let service: PayrollService;
  let payrollRunsRepository: Record<string, jest.Mock>;
  let payrollItemsRepository: Record<string, jest.Mock>;
  let employeesRepository: Record<string, jest.Mock>;
  let contractsRepository: Record<string, jest.Mock>;
  let unifiedSettings: Record<string, jest.Mock>;
  let journalPosterService: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const runId = 'run-1';
  const employeeId = 'emp-1';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockRun = {
    id: runId,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    status: PayrollStatus.DRAFT,
    currency: 'SAR',
    totalEmployees: 0,
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalGosiEmployer: 0,
  };

  const mockSaudiEmployee = {
    id: employeeId,
    nameEn: 'Ahmed',
    nameAr: 'أحمد',
    isSaudi: true,
  };

  const mockNonSaudiEmployee = {
    id: 'emp-2',
    nameEn: 'John',
    nameAr: 'جون',
    isSaudi: false,
  };

  const mockContract = {
    id: 'contract-1',
    employeeId,
    basicSalary: 10000,
    housingAllowance: 2500,
    transportationAllowance: 500,
    status: ContractStatus.ACTIVE,
  };

  beforeEach(() => {
    payrollRunsRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByIdOrNull: jest.fn(),
      update: jest.fn(),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    payrollItemsRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findByRunId: jest.fn(),
      findByRunAndEmployee: jest.fn(),
      findByIdOrNull: jest.fn(),
      hardDelete: jest.fn(),
      getPayrollReport: jest.fn(),
    };

    employeesRepository = {
      findByIdOrNull: jest.fn(),
    };

    contractsRepository = {
      findActiveByEmployee: jest.fn(),
    };

    unifiedSettings = {
      get: jest.fn(),
    };

    journalPosterService = {
      postPayroll: jest.fn(),
    };

    notificationsService = {
      createEvent: jest.fn(),
    };

    service = new PayrollService(
      payrollRunsRepository as any,
      payrollItemsRepository as any,
      employeesRepository as any,
      contractsRepository as any,
      unifiedSettings as any,
      journalPosterService as any,
      notificationsService as any,
    );
  });

  // ── createRun ──────────────────────────────────────────────────────────────

  describe('createRun()', () => {
    it('should create a payroll run with DRAFT status', async () => {
      const dto = { periodStart: '2026-03-01', periodEnd: '2026-03-31', notes: 'March payroll' };
      payrollRunsRepository.create.mockResolvedValue(mockRun);

      const result = await service.createRun(tenantId, dto as any, auditContext);

      expect(payrollRunsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          periodStart: '2026-03-01',
          periodEnd: '2026-03-31',
          status: PayrollStatus.DRAFT,
          currency: 'SAR',
          totalEmployees: 0,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          totalGosiEmployer: 0,
        }),
        expect.objectContaining({ tenantId, auditContext }),
      );
    });

    it('should default notes to null when not provided', async () => {
      const dto = { periodStart: '2026-03-01', periodEnd: '2026-03-31' };
      payrollRunsRepository.create.mockResolvedValue(mockRun);

      await service.createRun(tenantId, dto as any, auditContext);

      expect(payrollRunsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
        expect.any(Object),
      );
    });
  });

  // ── addItem — Saudi employee ───────────────────────────────────────────────

  describe('addItem() — Saudi employee', () => {
    const addItemDto = { employeeId, absentDays: 0 };

    beforeEach(() => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(mockRun);
      employeesRepository.findByIdOrNull.mockResolvedValue(mockSaudiEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(mockContract);
      unifiedSettings.get.mockResolvedValue(SalaryBasis.FIXED_30);
      payrollItemsRepository.findByRunAndEmployee.mockResolvedValue(null);
      payrollItemsRepository.create.mockImplementation((data) => Promise.resolve(data));
      payrollItemsRepository.findByRunId.mockResolvedValue([]);
      payrollRunsRepository.update.mockResolvedValue(undefined);
    });

    it('should read salary from active contract (not employee)', async () => {
      await service.addItem(tenantId, runId, addItemDto as any, auditContext);

      expect(contractsRepository.findActiveByEmployee).toHaveBeenCalledWith(
        tenantId,
        employeeId,
        mockTransaction,
      );
    });

    it('should calculate gross = basic + housing + transportation', async () => {
      await service.addItem(tenantId, runId, addItemDto as any, auditContext);

      expect(payrollItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          basicSalary: 10000,
          housingAllowance: 2500,
          transportationAllowance: 500,
          grossSalary: 13000, // 10000 + 2500 + 500
        }),
        expect.any(Object),
      );
    });

    it('should calculate GOSI for Saudi: 9.75% employee + 11.75% employer', async () => {
      await service.addItem(tenantId, runId, addItemDto as any, auditContext);

      // gross = 13000
      // gosiEmployee = 13000 * 0.0975 = 1267.50
      // gosiEmployer = 13000 * 0.1175 = 1527.50
      expect(payrollItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gosiEmployee: 1267.5,
          gosiEmployer: 1527.5,
        }),
        expect.any(Object),
      );
    });

    it('should calculate NET = gross - gosiEmployee - deductions', async () => {
      await service.addItem(tenantId, runId, addItemDto as any, auditContext);

      // gross = 13000, gosiEmployee = 1267.50, no advance
      // net = 13000 - 1267.50 = 11732.50
      expect(payrollItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          netPay: 11732.5,
        }),
        expect.any(Object),
      );
    });

    it('should apply absent deduction with daily rate based on FIXED_30 basis', async () => {
      const dtoWithAbsence = { employeeId, absentDays: 3 };

      await service.addItem(tenantId, runId, dtoWithAbsence as any, auditContext);

      // dailyRate = 10000 / 30 = 333.333...
      // absentDeduction = 3 * 333.333... = 1000 (rounded to 2 dp)
      // grossSalary = 10000 + 2500 + 500 - 1000 = 12000
      expect(payrollItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          grossSalary: 12000,
          absenceDeductions: 1000,
        }),
        expect.any(Object),
      );
    });

    it('should cap advance deduction at 25% of net-before-bonus (Saudi labor law)', async () => {
      const dtoWithAdvance = { employeeId, absentDays: 0, pendingAdvance: 50000 };

      await service.addItem(tenantId, runId, dtoWithAdvance as any, auditContext);

      // gross = 13000, gosiEmployee = 1267.5
      // netBeforeBonus = 13000 - 1267.5 = 11732.5
      // maxAdvance = 11732.5 * 0.25 = 2933.13 (rounded)
      const itemData = payrollItemsRepository.create.mock.calls[0][0];
      const totalDeductions = itemData.totalDeductions;
      // totalDeductions = absenceDeduction(0) + gosiEmployee(1267.5) + advanceDeducted(2933.13)
      expect(totalDeductions).toBeCloseTo(1267.5 + 2933.13, 1);
    });
  });

  // ── addItem — Non-Saudi employee ───────────────────────────────────────────

  describe('addItem() — Non-Saudi employee', () => {
    const addItemDto = { employeeId: 'emp-2', absentDays: 0 };

    beforeEach(() => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(mockRun);
      employeesRepository.findByIdOrNull.mockResolvedValue(mockNonSaudiEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue({
        ...mockContract,
        employeeId: 'emp-2',
      });
      unifiedSettings.get.mockResolvedValue(SalaryBasis.FIXED_30);
      payrollItemsRepository.findByRunAndEmployee.mockResolvedValue(null);
      payrollItemsRepository.create.mockImplementation((data) => Promise.resolve(data));
      payrollItemsRepository.findByRunId.mockResolvedValue([]);
      payrollRunsRepository.update.mockResolvedValue(undefined);
    });

    it('should calculate GOSI for Non-Saudi: 0% employee + 11.75% employer', async () => {
      await service.addItem(tenantId, runId, addItemDto as any, auditContext);

      // gross = 13000
      // gosiEmployee = 0 (non-Saudi)
      // gosiEmployer = 13000 * 0.1175 = 1527.50
      expect(payrollItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gosiEmployee: 0,
          gosiEmployer: 1527.5,
        }),
        expect.any(Object),
      );
    });

    it('should calculate NET with zero GOSI employee deduction for non-Saudi', async () => {
      await service.addItem(tenantId, runId, addItemDto as any, auditContext);

      // gross = 13000, gosiEmployee = 0, no advance
      // net = 13000 - 0 = 13000
      expect(payrollItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          netPay: 13000,
        }),
        expect.any(Object),
      );
    });
  });

  // ── addItem — Salary basis (actual days) ───────────────────────────────────

  describe('addItem() — Actual days salary basis', () => {
    it('should use actual days in month for salary calculation', async () => {
      // March 2026 has 31 days
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(mockRun);
      employeesRepository.findByIdOrNull.mockResolvedValue(mockSaudiEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(mockContract);
      unifiedSettings.get.mockResolvedValue(SalaryBasis.ACTUAL_DAYS);
      payrollItemsRepository.findByRunAndEmployee.mockResolvedValue(null);
      payrollItemsRepository.create.mockImplementation((data) => Promise.resolve(data));
      payrollItemsRepository.findByRunId.mockResolvedValue([]);
      payrollRunsRepository.update.mockResolvedValue(undefined);

      const dto = { employeeId, absentDays: 1 };
      await service.addItem(tenantId, runId, dto as any, auditContext);

      // dailyRate = 10000 / 31 = 322.58...
      // absentDeduction = 1 * 322.58 = 322.58 (rounded to 2 dp)
      const itemData = payrollItemsRepository.create.mock.calls[0][0];
      expect(itemData.absenceDeductions).toBeCloseTo(322.58, 0);
    });

    it('should use 30 days for FIXED_30 basis regardless of actual month length', async () => {
      // February 2026 has 28 days but FIXED_30 → 30
      const febRun = { ...mockRun, periodStart: '2026-02-01', periodEnd: '2026-02-28' };
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(febRun);
      employeesRepository.findByIdOrNull.mockResolvedValue(mockSaudiEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(mockContract);
      unifiedSettings.get.mockResolvedValue(SalaryBasis.FIXED_30);
      payrollItemsRepository.findByRunAndEmployee.mockResolvedValue(null);
      payrollItemsRepository.create.mockImplementation((data) => Promise.resolve(data));
      payrollItemsRepository.findByRunId.mockResolvedValue([]);
      payrollRunsRepository.update.mockResolvedValue(undefined);

      const dto = { employeeId, absentDays: 1 };
      await service.addItem(tenantId, runId, dto as any, auditContext);

      // dailyRate = 10000 / 30 = 333.33
      const itemData = payrollItemsRepository.create.mock.calls[0][0];
      expect(itemData.absenceDeductions).toBeCloseTo(333.33, 0);
    });
  });

  // ── addItem — Validation ───────────────────────────────────────────────────

  describe('addItem() — Validation', () => {
    it('should throw NotFoundException when payroll run not found', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.addItem(tenantId, 'nonexistent', { employeeId } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payroll run is not DRAFT', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue({
        ...mockRun,
        status: PayrollStatus.CONFIRMED,
      });

      await expect(
        service.addItem(tenantId, runId, { employeeId } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when employee not found', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(mockRun);
      employeesRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.addItem(tenantId, runId, { employeeId: 'ghost' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── addItem — Upsert behavior ──────────────────────────────────────────────

  describe('addItem() — Upsert', () => {
    it('should update existing item instead of creating new one', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(mockRun);
      employeesRepository.findByIdOrNull.mockResolvedValue(mockSaudiEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(mockContract);
      unifiedSettings.get.mockResolvedValue(SalaryBasis.FIXED_30);
      payrollItemsRepository.findByRunAndEmployee.mockResolvedValue({ id: 'existing-item' });
      payrollItemsRepository.update.mockResolvedValue({ id: 'existing-item' });

      await service.addItem(tenantId, runId, { employeeId, absentDays: 0 } as any, auditContext);

      expect(payrollItemsRepository.update).toHaveBeenCalled();
      expect(payrollItemsRepository.create).not.toHaveBeenCalled();
    });
  });

  // ── confirmRun ─────────────────────────────────────────────────────────────

  describe('confirmRun()', () => {
    it('should confirm a DRAFT run', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(mockRun);
      payrollRunsRepository.update.mockResolvedValue({
        ...mockRun,
        status: PayrollStatus.CONFIRMED,
      });

      const result = await service.confirmRun(tenantId, runId, auditContext);

      expect(payrollRunsRepository.update).toHaveBeenCalledWith(
        runId,
        expect.objectContaining({ status: PayrollStatus.CONFIRMED }),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when run is not DRAFT', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue({
        ...mockRun,
        status: PayrollStatus.APPROVED,
      });

      await expect(service.confirmRun(tenantId, runId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── approveRun ─────────────────────────────────────────────────────────────

  describe('approveRun()', () => {
    it('should approve a CONFIRMED run and post journal entry', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue({
        ...mockRun,
        status: PayrollStatus.CONFIRMED,
      });
      payrollRunsRepository.update.mockResolvedValue({
        ...mockRun,
        status: PayrollStatus.APPROVED,
      });
      payrollItemsRepository.findByRunId.mockResolvedValue([]);
      employeesRepository.findByIdOrNull.mockResolvedValue(null);

      await service.approveRun(tenantId, runId, auditContext);

      expect(payrollRunsRepository.update).toHaveBeenCalledWith(
        runId,
        expect.objectContaining({ status: PayrollStatus.APPROVED }),
        expect.any(Object),
      );
      expect(journalPosterService.postPayroll).toHaveBeenCalled();
    });

    it('should throw BadRequestException when run is not CONFIRMED', async () => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue({
        ...mockRun,
        status: PayrollStatus.DRAFT,
      });

      await expect(service.approveRun(tenantId, runId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── GOSI verification with exact numbers ───────────────────────────────────

  describe('GOSI calculation — exact numbers', () => {
    beforeEach(() => {
      payrollRunsRepository.findByIdOrNull.mockResolvedValue(mockRun);
      unifiedSettings.get.mockResolvedValue(SalaryBasis.FIXED_30);
      payrollItemsRepository.findByRunAndEmployee.mockResolvedValue(null);
      payrollItemsRepository.create.mockImplementation((data) => Promise.resolve(data));
      payrollItemsRepository.findByRunId.mockResolvedValue([]);
      payrollRunsRepository.update.mockResolvedValue(undefined);
    });

    it('Saudi — basic=5000, housing=1250, transport=250 → gross=6500, gosiEE=633.75, gosiER=763.75', async () => {
      const contract = {
        basicSalary: 5000,
        housingAllowance: 1250,
        transportationAllowance: 250,
      };
      employeesRepository.findByIdOrNull.mockResolvedValue(mockSaudiEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(contract);

      await service.addItem(tenantId, runId, { employeeId, absentDays: 0 } as any, auditContext);

      const item = payrollItemsRepository.create.mock.calls[0][0];
      expect(item.grossSalary).toBe(6500);
      expect(item.gosiEmployee).toBe(633.75);
      expect(item.gosiEmployer).toBe(763.75);
      expect(item.netPay).toBe(5866.25); // 6500 - 633.75
    });

    it('Non-Saudi — basic=8000, housing=0, transport=0 → gross=8000, gosiEE=0, gosiER=940', async () => {
      const contract = {
        basicSalary: 8000,
        housingAllowance: 0,
        transportationAllowance: 0,
      };
      employeesRepository.findByIdOrNull.mockResolvedValue(mockNonSaudiEmployee);
      contractsRepository.findActiveByEmployee.mockResolvedValue(contract);

      await service.addItem(
        tenantId,
        runId,
        { employeeId: 'emp-2', absentDays: 0 } as any,
        auditContext,
      );

      const item = payrollItemsRepository.create.mock.calls[0][0];
      expect(item.grossSalary).toBe(8000);
      expect(item.gosiEmployee).toBe(0);
      expect(item.gosiEmployer).toBe(940);
      expect(item.netPay).toBe(8000); // 8000 - 0
    });
  });
});
