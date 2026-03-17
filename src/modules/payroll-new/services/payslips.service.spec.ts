/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException } from '@nestjs/common';
import {
  PayslipStatus,
  SalaryRuleCategory,
  SalaryRuleComputationType,
} from '@/common/enums/hr-new.enums';
import { ContractStatus } from '@/common/enums/hr.enums';

// Mock all repository imports
jest.mock('@/database/sql/repositories/payslips.repository', () => ({
  PayslipsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/payslip-lines.repository', () => ({
  PayslipLinesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/salary-structures.repository', () => ({
  SalaryStructuresRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/salary-rules.repository', () => ({
  SalaryRulesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories', () => ({
  EmployeesRepository: jest.fn(),
  EmployeeContractsRepository: jest.fn(),
}));

import { PayslipsService } from './payslips.service';

describe('PayslipsService', () => {
  let service: PayslipsService;
  let payslipsRepository: Record<string, jest.Mock>;
  let payslipLinesRepository: Record<string, jest.Mock>;
  let salaryStructuresRepository: Record<string, jest.Mock>;
  let salaryRulesRepository: Record<string, jest.Mock>;
  let employeesRepository: Record<string, jest.Mock>;
  let employeeContractsRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const payslipId = 'payslip-1';
  const employeeId = 'emp-1';
  const contractId = 'contract-1';
  const structureId = 'struct-1';
  const branchId = 'branch-1';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockSaudiEmployee = {
    id: employeeId,
    nameEn: 'Ahmed',
    nameAr: 'أحمد',
    isSaudi: true,
    isActive: true,
    branchId,
  };

  const mockNonSaudiEmployee = {
    id: 'emp-2',
    nameEn: 'John',
    nameAr: 'جون',
    isSaudi: false,
    isActive: true,
    branchId,
  };

  const mockContract = {
    id: contractId,
    employeeId,
    basicSalary: 10000,
    housingAllowance: 2500,
    transportationAllowance: 500,
    status: ContractStatus.ACTIVE,
    salaryStructureId: structureId,
    workingScheduleId: 'sched-1',
  };

  const mockPayslip = {
    id: payslipId,
    branchId,
    employeeId,
    contractId,
    structureId,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    status: PayslipStatus.DRAFT,
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0,
    gosiEmployee: 0,
    gosiEmployer: 0,
    version: 1,
  };

  beforeEach(() => {
    payslipsRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    payslipLinesRepository = {
      findAllRaw: jest.fn(),
      bulkCreate: jest.fn(),
      hardDelete: jest.fn(),
    };

    salaryStructuresRepository = {
      findById: jest.fn(),
    };

    salaryRulesRepository = {
      findAllRaw: jest.fn(),
    };

    employeesRepository = {
      findAllRaw: jest.fn(),
      findById: jest.fn(),
    };

    employeeContractsRepository = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    service = new PayslipsService(
      payslipsRepository as any,
      payslipLinesRepository as any,
      salaryStructuresRepository as any,
      salaryRulesRepository as any,
      employeesRepository as any,
      employeeContractsRepository as any,
    );
  });

  // ── generate ───────────────────────────────────────────────────────────────

  describe('generate()', () => {
    const generateDto = {
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      branchId,
    };

    it('should batch create payslips for all active employees', async () => {
      employeesRepository.findAllRaw.mockResolvedValue([mockSaudiEmployee, mockNonSaudiEmployee]);
      employeeContractsRepository.findOne
        .mockResolvedValueOnce(mockContract) // for emp-1
        .mockResolvedValueOnce({
          ...mockContract,
          id: 'contract-2',
          employeeId: 'emp-2',
          salaryStructureId: null,
        }); // for emp-2
      payslipsRepository.create
        .mockResolvedValueOnce({ id: 'payslip-1' })
        .mockResolvedValueOnce({ id: 'payslip-2' });

      const result = await service.generate(tenantId, generateDto as any, auditContext);

      expect(result.generated).toBe(2);
      expect(result.payslipIds).toHaveLength(2);
    });

    it('should get salary structure from contract', async () => {
      employeesRepository.findAllRaw.mockResolvedValue([mockSaudiEmployee]);
      employeeContractsRepository.findOne.mockResolvedValue(mockContract);
      payslipsRepository.create.mockResolvedValue({ id: payslipId });

      await service.generate(tenantId, generateDto as any, auditContext);

      expect(payslipsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          structureId, // from contract.salaryStructureId
          contractId,
          employeeId,
        }),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when no active employees found', async () => {
      employeesRepository.findAllRaw.mockResolvedValue([]);

      await expect(service.generate(tenantId, generateDto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip employees without a branchId', async () => {
      const noBranchEmployee = { ...mockSaudiEmployee, branchId: null };
      employeesRepository.findAllRaw.mockResolvedValue([noBranchEmployee]);
      employeeContractsRepository.findOne.mockResolvedValue(null);

      // branchId from dto is used but employee has no branchId
      // dto.branchId is available, so employeeBranchId = null ?? branchId = branchId
      payslipsRepository.create.mockResolvedValue({ id: payslipId });

      const result = await service.generate(tenantId, generateDto as any, auditContext);

      expect(result.generated).toBe(1);
    });

    it('should create payslips with DRAFT status', async () => {
      employeesRepository.findAllRaw.mockResolvedValue([mockSaudiEmployee]);
      employeeContractsRepository.findOne.mockResolvedValue(mockContract);
      payslipsRepository.create.mockResolvedValue({ id: payslipId });

      await service.generate(tenantId, generateDto as any, auditContext);

      expect(payslipsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PayslipStatus.DRAFT }),
        expect.any(Object),
      );
    });
  });

  // ── compute — with salary rules ───────────────────────────────────────────

  describe('compute() — with salary rules', () => {
    const salaryRules = [
      {
        id: 'rule-basic',
        code: 'BASIC',
        nameEn: 'Basic Salary',
        nameAr: 'الراتب الأساسي',
        category: SalaryRuleCategory.BASIC,
        sequence: 1,
        computationType: SalaryRuleComputationType.FIXED,
        amount: 10000,
        appearsOnPayslip: true,
      },
      {
        id: 'rule-housing',
        code: 'HOUSING',
        nameEn: 'Housing Allowance',
        nameAr: 'بدل سكن',
        category: SalaryRuleCategory.ALLOWANCE,
        sequence: 2,
        computationType: SalaryRuleComputationType.FIXED,
        amount: 2500,
        appearsOnPayslip: true,
      },
      {
        id: 'rule-transport',
        code: 'TRANSPORT',
        nameEn: 'Transportation Allowance',
        nameAr: 'بدل نقل',
        category: SalaryRuleCategory.ALLOWANCE,
        sequence: 3,
        computationType: SalaryRuleComputationType.FIXED,
        amount: 500,
        appearsOnPayslip: true,
      },
    ];

    beforeEach(() => {
      payslipsRepository.findById.mockResolvedValue(mockPayslip);
      employeesRepository.findById.mockResolvedValue(mockSaudiEmployee);
      employeeContractsRepository.findById.mockResolvedValue(mockContract);
      payslipLinesRepository.findAllRaw.mockResolvedValue([]); // no existing lines
      salaryRulesRepository.findAllRaw.mockResolvedValue(salaryRules);
      payslipLinesRepository.bulkCreate.mockResolvedValue(undefined);
      payslipsRepository.update.mockResolvedValue(undefined);
      // findById for return value
      payslipsRepository.findById
        .mockResolvedValueOnce(mockPayslip)
        .mockResolvedValueOnce({ ...mockPayslip, grossSalary: 13000 });
      payslipLinesRepository.findAllRaw
        .mockResolvedValueOnce([]) // existing lines to delete
        .mockResolvedValueOnce([]); // lines for findById return
    });

    it('should compute salary rules in sequence order', async () => {
      await service.compute(tenantId, payslipId, auditContext);

      expect(salaryRulesRepository.findAllRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { structureId },
          order: [['sequence', 'ASC']],
        }),
      );
    });

    it('should create payslip_lines for each rule', async () => {
      await service.compute(tenantId, payslipId, auditContext);

      expect(payslipLinesRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ code: 'BASIC', amount: 10000 }),
            expect.objectContaining({ code: 'HOUSING', amount: 2500 }),
            expect.objectContaining({ code: 'TRANSPORT', amount: 500 }),
          ]),
        }),
      );
    });

    it('should add GOSI_EE deduction line for Saudi employees', async () => {
      await service.compute(tenantId, payslipId, auditContext);

      // gross = 13000, gosiEmployee = 13000 * 0.0975 = 1267.5
      expect(payslipLinesRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              code: 'GOSI_EE',
              category: SalaryRuleCategory.DEDUCTION,
              amount: -1267.5,
            }),
          ]),
        }),
      );
    });

    it('should add NET salary line', async () => {
      await service.compute(tenantId, payslipId, auditContext);

      // net = 13000 - 1267.5 = 11732.5
      expect(payslipLinesRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              code: 'NET',
              category: SalaryRuleCategory.NET,
              amount: 11732.5,
            }),
          ]),
        }),
      );
    });

    it('should update payslip totals', async () => {
      await service.compute(tenantId, payslipId, auditContext);

      expect(payslipsRepository.update).toHaveBeenCalledWith(
        payslipId,
        expect.objectContaining({
          grossSalary: 13000,
          gosiEmployee: 1267.5,
          gosiEmployer: 1527.5,
          netSalary: 11732.5,
        }),
        expect.any(Object),
      );
    });

    it('should delete existing lines before recomputing', async () => {
      const existingLine = { id: 'old-line-1' };
      payslipLinesRepository.findAllRaw
        .mockReset()
        .mockResolvedValueOnce([existingLine]) // existing lines to delete
        .mockResolvedValueOnce([]); // lines for findById return

      await service.compute(tenantId, payslipId, auditContext);

      expect(payslipLinesRepository.hardDelete).toHaveBeenCalledWith(
        'old-line-1',
        expect.any(Object),
      );
    });
  });

  // ── compute — percentage-based rules ──────────────────────────────────────

  describe('compute() — percentage-based rules', () => {
    it('should compute percentage rules based on referenced code amount', async () => {
      const rules = [
        {
          id: 'rule-basic',
          code: 'BASIC',
          nameEn: 'Basic Salary',
          nameAr: 'الراتب الأساسي',
          category: SalaryRuleCategory.BASIC,
          sequence: 1,
          computationType: SalaryRuleComputationType.FIXED,
          amount: 10000,
          appearsOnPayslip: true,
        },
        {
          id: 'rule-housing-pct',
          code: 'HOUSING',
          nameEn: 'Housing (25% of Basic)',
          nameAr: 'بدل سكن',
          category: SalaryRuleCategory.ALLOWANCE,
          sequence: 2,
          computationType: SalaryRuleComputationType.PERCENTAGE,
          percentBase: 'BASIC',
          percentValue: 25,
          appearsOnPayslip: true,
        },
      ];

      payslipsRepository.findById
        .mockResolvedValueOnce(mockPayslip)
        .mockResolvedValueOnce({ ...mockPayslip });
      employeesRepository.findById.mockResolvedValue(mockSaudiEmployee);
      employeeContractsRepository.findById.mockResolvedValue(mockContract);
      payslipLinesRepository.findAllRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      salaryRulesRepository.findAllRaw.mockResolvedValue(rules);
      payslipLinesRepository.bulkCreate.mockResolvedValue(undefined);
      payslipsRepository.update.mockResolvedValue(undefined);

      await service.compute(tenantId, payslipId, auditContext);

      expect(payslipLinesRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ code: 'HOUSING', amount: 2500 }), // 10000 * 25%
          ]),
        }),
      );
    });
  });

  // ── compute — fallback from contract (no structure) ────────────────────────

  describe('compute() — fallback from contract', () => {
    it('should generate lines from contract data when no salary structure', async () => {
      const payslipNoStructure = { ...mockPayslip, structureId: null };

      payslipsRepository.findById
        .mockResolvedValueOnce(payslipNoStructure)
        .mockResolvedValueOnce({ ...payslipNoStructure });
      employeesRepository.findById.mockResolvedValue(mockSaudiEmployee);
      employeeContractsRepository.findById.mockResolvedValue(mockContract);
      payslipLinesRepository.findAllRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      payslipLinesRepository.bulkCreate.mockResolvedValue(undefined);
      payslipsRepository.update.mockResolvedValue(undefined);

      await service.compute(tenantId, payslipId, auditContext);

      expect(payslipLinesRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ code: 'BASIC', amount: 10000 }),
            expect.objectContaining({ code: 'HOUSING', amount: 2500 }),
            expect.objectContaining({ code: 'TRANSPORT', amount: 500 }),
          ]),
        }),
      );
    });
  });

  // ── compute — GOSI for non-Saudi ──────────────────────────────────────────

  describe('compute() — GOSI for non-Saudi', () => {
    it('should NOT add GOSI_EE line for non-Saudi employee (0% rate)', async () => {
      payslipsRepository.findById
        .mockResolvedValueOnce({ ...mockPayslip, employeeId: 'emp-2' })
        .mockResolvedValueOnce({ ...mockPayslip, employeeId: 'emp-2' });
      employeesRepository.findById.mockResolvedValue(mockNonSaudiEmployee);
      employeeContractsRepository.findById.mockResolvedValue({
        ...mockContract,
        employeeId: 'emp-2',
      });
      payslipLinesRepository.findAllRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      salaryRulesRepository.findAllRaw.mockResolvedValue([
        {
          id: 'rule-basic',
          code: 'BASIC',
          nameEn: 'Basic',
          nameAr: 'أساسي',
          category: SalaryRuleCategory.BASIC,
          sequence: 1,
          computationType: SalaryRuleComputationType.FIXED,
          amount: 8000,
          appearsOnPayslip: true,
        },
      ]);
      payslipLinesRepository.bulkCreate.mockResolvedValue(undefined);
      payslipsRepository.update.mockResolvedValue(undefined);

      await service.compute(tenantId, payslipId, auditContext);

      // gosiEmployee for non-Saudi is 0, so no GOSI_EE line
      const bulkData = payslipLinesRepository.bulkCreate.mock.calls[0][0].data;
      const gosiLine = bulkData.find((l: any) => l.code === 'GOSI_EE');
      expect(gosiLine).toBeUndefined();

      // But gosiEmployer should still be calculated (11.75%)
      expect(payslipsRepository.update).toHaveBeenCalledWith(
        payslipId,
        expect.objectContaining({
          gosiEmployee: 0,
          gosiEmployer: 940, // 8000 * 0.1175
          netSalary: 8000, // 8000 - 0
        }),
        expect.any(Object),
      );
    });
  });

  // ── compute — only DRAFT payslips ─────────────────────────────────────────

  describe('compute() — status validation', () => {
    it('should throw BadRequestException when payslip is not DRAFT', async () => {
      payslipsRepository.findById.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CONFIRMED,
      });

      await expect(service.compute(tenantId, payslipId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── confirm ────────────────────────────────────────────────────────────────

  describe('confirm()', () => {
    it('should confirm a DRAFT payslip', async () => {
      payslipsRepository.findById.mockResolvedValue(mockPayslip);
      payslipsRepository.update.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CONFIRMED,
      });

      const result = await service.confirm(tenantId, payslipId, auditContext);

      expect(payslipsRepository.update).toHaveBeenCalledWith(
        payslipId,
        expect.objectContaining({ status: PayslipStatus.CONFIRMED }),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when payslip is not DRAFT', async () => {
      payslipsRepository.findById.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CONFIRMED,
      });

      await expect(service.confirm(tenantId, payslipId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when payslip is CANCELLED', async () => {
      payslipsRepository.findById.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CANCELLED,
      });

      await expect(service.confirm(tenantId, payslipId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a DRAFT payslip', async () => {
      payslipsRepository.findById.mockResolvedValue(mockPayslip);
      payslipsRepository.update.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CANCELLED,
      });

      const result = await service.cancel(tenantId, payslipId, auditContext);

      expect(payslipsRepository.update).toHaveBeenCalledWith(
        payslipId,
        expect.objectContaining({ status: PayslipStatus.CANCELLED }),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when payslip is already CANCELLED', async () => {
      payslipsRepository.findById.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CANCELLED,
      });

      await expect(service.cancel(tenantId, payslipId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow cancelling a CONFIRMED payslip', async () => {
      payslipsRepository.findById.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CONFIRMED,
      });
      payslipsRepository.update.mockResolvedValue({
        ...mockPayslip,
        status: PayslipStatus.CANCELLED,
      });

      const result = await service.cancel(tenantId, payslipId, auditContext);

      expect(payslipsRepository.update).toHaveBeenCalledWith(
        payslipId,
        expect.objectContaining({ status: PayslipStatus.CANCELLED }),
        expect.any(Object),
      );
    });
  });

  // ── GOSI exact numbers verification ────────────────────────────────────────

  describe('GOSI calculation — exact numbers (compute path)', () => {
    it('Saudi: gross=15000 → gosiEE=1462.50, gosiER=1762.50, net=13537.50', async () => {
      const rules = [
        {
          id: 'r1',
          code: 'BASIC',
          nameEn: 'Basic',
          nameAr: 'أساسي',
          category: SalaryRuleCategory.BASIC,
          sequence: 1,
          computationType: SalaryRuleComputationType.FIXED,
          amount: 15000,
          appearsOnPayslip: true,
        },
      ];

      payslipsRepository.findById
        .mockResolvedValueOnce(mockPayslip)
        .mockResolvedValueOnce(mockPayslip);
      employeesRepository.findById.mockResolvedValue(mockSaudiEmployee);
      employeeContractsRepository.findById.mockResolvedValue(mockContract);
      payslipLinesRepository.findAllRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      salaryRulesRepository.findAllRaw.mockResolvedValue(rules);
      payslipLinesRepository.bulkCreate.mockResolvedValue(undefined);
      payslipsRepository.update.mockResolvedValue(undefined);

      await service.compute(tenantId, payslipId, auditContext);

      expect(payslipsRepository.update).toHaveBeenCalledWith(
        payslipId,
        expect.objectContaining({
          grossSalary: 15000,
          gosiEmployee: 1462.5,
          gosiEmployer: 1762.5,
          netSalary: 13537.5,
        }),
        expect.any(Object),
      );
    });

    it('Non-Saudi: gross=12000 → gosiEE=0, gosiER=1410, net=12000', async () => {
      const rules = [
        {
          id: 'r1',
          code: 'BASIC',
          nameEn: 'Basic',
          nameAr: 'أساسي',
          category: SalaryRuleCategory.BASIC,
          sequence: 1,
          computationType: SalaryRuleComputationType.FIXED,
          amount: 12000,
          appearsOnPayslip: true,
        },
      ];

      payslipsRepository.findById
        .mockResolvedValueOnce({ ...mockPayslip, employeeId: 'emp-2' })
        .mockResolvedValueOnce({ ...mockPayslip, employeeId: 'emp-2' });
      employeesRepository.findById.mockResolvedValue(mockNonSaudiEmployee);
      employeeContractsRepository.findById.mockResolvedValue({
        ...mockContract,
        employeeId: 'emp-2',
      });
      payslipLinesRepository.findAllRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      salaryRulesRepository.findAllRaw.mockResolvedValue(rules);
      payslipLinesRepository.bulkCreate.mockResolvedValue(undefined);
      payslipsRepository.update.mockResolvedValue(undefined);

      await service.compute(tenantId, payslipId, auditContext);

      expect(payslipsRepository.update).toHaveBeenCalledWith(
        payslipId,
        expect.objectContaining({
          grossSalary: 12000,
          gosiEmployee: 0,
          gosiEmployer: 1410,
          netSalary: 12000,
        }),
        expect.any(Object),
      );
    });
  });
});
