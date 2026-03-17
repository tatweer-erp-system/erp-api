import { Injectable, BadRequestException } from '@nestjs/common';
import { Transaction, Op } from 'sequelize';
import { PayslipsRepository } from '@/database/sql/repositories/payslips.repository';
import { PayslipLinesRepository } from '@/database/sql/repositories/payslip-lines.repository';
import { SalaryStructuresRepository } from '@/database/sql/repositories/salary-structures.repository';
import { SalaryRulesRepository } from '@/database/sql/repositories/salary-rules.repository';
import { EmployeesRepository } from '@/database/sql/repositories';
import { EmployeeContractsRepository } from '@/database/sql/repositories';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  PayslipStatus,
  SalaryRuleCategory,
  SalaryRuleComputationType,
} from '@/common/enums/hr-new.enums';
import { ContractStatus } from '@/common/enums/hr.enums';
import { PayslipFilterDto } from '../dto/payslip-filter.dto';
import { GeneratePayslipsDto } from '../dto/generate-payslips.dto';
import { PayslipLine } from '@/database/sql/entities/payslip-line.entity';

/** GOSI rates per the Saudi system */
const GOSI_EMPLOYEE_SAUDI = 0.0975;
const GOSI_EMPLOYER_SAUDI = 0.1175;
const GOSI_EMPLOYEE_NON_SAUDI = 0;
const GOSI_EMPLOYER_NON_SAUDI = 0.1175;

@Injectable()
export class PayslipsService {
  constructor(
    private readonly payslipsRepository: PayslipsRepository,
    private readonly payslipLinesRepository: PayslipLinesRepository,
    private readonly salaryStructuresRepository: SalaryStructuresRepository,
    private readonly salaryRulesRepository: SalaryRulesRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly employeeContractsRepository: EmployeeContractsRepository,
  ) {}

  // ── List ────────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: PayslipFilterDto) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.periodStart) where.periodStart = { [Op.gte]: query.periodStart };
    if (query.periodEnd) where.periodEnd = { [Op.lte]: query.periodEnd };

    return this.payslipsRepository.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where,
      tenantId,
    });
  }

  // ── Single with lines ──────────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const payslip = await this.payslipsRepository.findById(id, { tenantId });
    const lines = await this.payslipLinesRepository.findAllRaw({
      where: { payslipId: id },
      tenantId,
      order: [['sequence', 'ASC']],
    });
    return { ...payslip, lines };
  }

  // ── Batch generate ─────────────────────────────────────────────────────────

  async generate(tenantId: string, dto: GeneratePayslipsDto, auditContext: AuditContext) {
    const branchId = dto.branchId;

    // Find all active employees
    const employeeWhere: Record<string, unknown> = { isActive: true };
    if (branchId) employeeWhere.branchId = branchId;
    const employees = await this.employeesRepository.findAllRaw({
      where: employeeWhere,
      tenantId,
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found for the given criteria.');
    }

    const transaction = await this.payslipsRepository.createTransaction();
    try {
      const payslipIds: string[] = [];

      for (const emp of employees) {
        // Find active contract for employee — salary data is on the contract
        const contract = await this.employeeContractsRepository.findOne({
          where: { employeeId: (emp as any).id, status: ContractStatus.ACTIVE },
          tenantId,
          transaction,
        });

        const employeeBranchId = (emp as any).branchId ?? branchId;
        if (!employeeBranchId) continue;

        // Use salary structure from contract if available, otherwise from DTO
        const structureId = contract
          ? ((contract as any).salaryStructureId ?? dto.structureId ?? null)
          : (dto.structureId ?? null);

        const payslip = await this.payslipsRepository.create(
          {
            branchId: employeeBranchId,
            employeeId: (emp as any).id,
            contractId: contract ? (contract as any).id : null,
            structureId,
            periodStart: dto.periodStart,
            periodEnd: dto.periodEnd,
            status: PayslipStatus.DRAFT,
          } as any,
          { tenantId, auditContext, transaction },
        );
        payslipIds.push((payslip as any).id);
      }

      await transaction.commit();
      return { generated: payslipIds.length, payslipIds };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  // ── Compute lines ─────────────────────────────────────────────────────────

  async compute(tenantId: string, payslipId: string, auditContext: AuditContext) {
    const transaction = await this.payslipsRepository.createTransaction();
    try {
      const payslip = await this.payslipsRepository.findById(payslipId, { tenantId, transaction });
      const ps = payslip as any;

      if (ps.status !== PayslipStatus.DRAFT) {
        throw new BadRequestException('Only draft payslips can be computed.');
      }

      // Get employee for GOSI calculation
      const employee = await this.employeesRepository.findById(ps.employeeId, {
        tenantId,
        transaction,
      });
      const emp = employee as any;

      // Get contract for salary data — salary is on the contract, not the employee
      const contract = ps.contractId
        ? await this.employeeContractsRepository.findById(ps.contractId, { tenantId, transaction })
        : null;
      const con = contract as any;

      // Delete existing lines
      const existingLines = await this.payslipLinesRepository.findAllRaw({
        where: { payslipId },
        tenantId,
        transaction,
      });
      for (const line of existingLines) {
        await this.payslipLinesRepository.hardDelete((line as any).id, { tenantId, transaction });
      }

      const lines: Partial<PayslipLine>[] = [];
      const codeAmounts: Record<string, number> = {};

      // If structure is set, use salary rules
      if (ps.structureId) {
        const rules = await this.salaryRulesRepository.findAllRaw({
          where: { structureId: ps.structureId },
          tenantId,
          order: [['sequence', 'ASC']],
          transaction,
        });

        for (const rule of rules) {
          const r = rule as any;
          let amount = 0;

          if (r.computationType === SalaryRuleComputationType.FIXED) {
            amount = Number(r.amount) || 0;
          } else if (r.computationType === SalaryRuleComputationType.PERCENTAGE) {
            const baseAmount = codeAmounts[r.percentBase] || 0;
            amount = baseAmount * (Number(r.percentValue) / 100);
          }
          // CODE type is not evaluated here (would need a sandbox)

          codeAmounts[r.code] = amount;

          lines.push({
            branchId: ps.branchId,
            payslipId,
            ruleId: r.id,
            code: r.code,
            nameEn: r.nameEn,
            nameAr: r.nameAr,
            category: r.category,
            sequence: r.sequence,
            quantity: 1,
            rate: 1,
            amount,
            appearsOnPayslip: r.appearsOnPayslip,
          });
        }
      } else if (con) {
        // Fallback: generate lines from contract data
        const basic = Number(con.basicSalary) || 0;
        codeAmounts['BASIC'] = basic;
        lines.push({
          branchId: ps.branchId,
          payslipId,
          code: 'BASIC',
          nameEn: 'Basic Salary',
          nameAr: 'الراتب الأساسي',
          category: SalaryRuleCategory.BASIC,
          sequence: 1,
          quantity: 1,
          rate: 1,
          amount: basic,
          appearsOnPayslip: true,
        });

        const housing = Number(con.housingAllowance) || 0;
        if (housing > 0) {
          codeAmounts['HOUSING'] = housing;
          lines.push({
            branchId: ps.branchId,
            payslipId,
            code: 'HOUSING',
            nameEn: 'Housing Allowance',
            nameAr: 'بدل سكن',
            category: SalaryRuleCategory.ALLOWANCE,
            sequence: 2,
            quantity: 1,
            rate: 1,
            amount: housing,
            appearsOnPayslip: true,
          });
        }

        const transport = Number(con.transportationAllowance) || 0;
        if (transport > 0) {
          codeAmounts['TRANSPORT'] = transport;
          lines.push({
            branchId: ps.branchId,
            payslipId,
            code: 'TRANSPORT',
            nameEn: 'Transportation Allowance',
            nameAr: 'بدل نقل',
            category: SalaryRuleCategory.ALLOWANCE,
            sequence: 3,
            quantity: 1,
            rate: 1,
            amount: transport,
            appearsOnPayslip: true,
          });
        }
      }

      // Calculate totals
      let grossSalary = 0;
      let totalDeductions = 0;

      for (const line of lines) {
        const amt = Number(line.amount) || 0;
        if (
          line.category === SalaryRuleCategory.BASIC ||
          line.category === SalaryRuleCategory.ALLOWANCE ||
          line.category === SalaryRuleCategory.GROSS
        ) {
          grossSalary += amt;
        } else if (line.category === SalaryRuleCategory.DEDUCTION) {
          totalDeductions += Math.abs(amt);
        }
      }

      // GOSI calculation — Saudi 9.75% employee + 11.75% employer, Non-Saudi 0% + 11.75%
      const isSaudi = emp.isSaudi ?? false;
      const gosiEmployee =
        Math.round(grossSalary * (isSaudi ? GOSI_EMPLOYEE_SAUDI : GOSI_EMPLOYEE_NON_SAUDI) * 100) /
        100;
      const gosiEmployer =
        Math.round(grossSalary * (isSaudi ? GOSI_EMPLOYER_SAUDI : GOSI_EMPLOYER_NON_SAUDI) * 100) /
        100;

      if (gosiEmployee > 0) {
        totalDeductions += gosiEmployee;
        lines.push({
          branchId: ps.branchId,
          payslipId,
          code: 'GOSI_EE',
          nameEn: 'GOSI (Employee)',
          nameAr: 'التأمينات الاجتماعية (موظف)',
          category: SalaryRuleCategory.DEDUCTION,
          sequence: 90,
          quantity: 1,
          rate: 1,
          amount: -gosiEmployee,
          appearsOnPayslip: true,
        });
      }

      const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

      // NET line
      lines.push({
        branchId: ps.branchId,
        payslipId,
        code: 'NET',
        nameEn: 'Net Salary',
        nameAr: 'صافي الراتب',
        category: SalaryRuleCategory.NET,
        sequence: 100,
        quantity: 1,
        rate: 1,
        amount: netSalary,
        appearsOnPayslip: true,
      });

      // Bulk create lines
      await this.payslipLinesRepository.bulkCreate({
        data: lines as Record<string, unknown>[],
        tenantId,
        auditContext,
        transaction,
      });

      // Update payslip totals
      await this.payslipsRepository.update(
        payslipId,
        {
          grossSalary,
          totalDeductions,
          netSalary,
          gosiEmployee,
          gosiEmployer,
          version: ps.version,
        } as any,
        { tenantId, auditContext, transaction },
      );

      await transaction.commit();
      return this.findById(tenantId, payslipId);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  async confirm(tenantId: string, payslipId: string, auditContext: AuditContext) {
    const payslip = await this.payslipsRepository.findById(payslipId, { tenantId });
    const ps = payslip as any;

    if (ps.status !== PayslipStatus.DRAFT) {
      throw new BadRequestException('Only draft payslips can be confirmed.');
    }

    return this.payslipsRepository.update(
      payslipId,
      { status: PayslipStatus.CONFIRMED, version: ps.version } as any,
      { tenantId, auditContext },
    );
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  async cancel(tenantId: string, payslipId: string, auditContext: AuditContext) {
    const payslip = await this.payslipsRepository.findById(payslipId, { tenantId });
    const ps = payslip as any;

    if (ps.status === PayslipStatus.CANCELLED) {
      throw new BadRequestException('Payslip is already cancelled.');
    }

    return this.payslipsRepository.update(
      payslipId,
      { status: PayslipStatus.CANCELLED, version: ps.version } as any,
      { tenantId, auditContext },
    );
  }
}
