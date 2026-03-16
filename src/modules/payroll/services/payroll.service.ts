import { Injectable } from '@nestjs/common';
import { SalaryStructuresRepository } from '@/database/sql/repositories/salary-structures.repository';
import { PayslipsRepository } from '@/database/sql/repositories/payslips.repository';
import { SalaryStructure } from '@/database/sql/entities/salary-structure.entity';
import { SalaryRule } from '@/database/sql/entities/salary-rule.entity';
import { Payslip } from '@/database/sql/entities/payslip.entity';
import { PayslipLine } from '@/database/sql/entities/payslip-line.entity';
import { StructureType, PayslipStatus } from '@/common/enums/payroll.enums';

@Injectable()
export class PayrollService {
  constructor(
    private readonly salaryStructuresRepo: SalaryStructuresRepository,
    private readonly payslipsRepo: PayslipsRepository,
  ) {}

  // ─── Salary Structures ───────────────────────────────────────────────────────

  findAllStructures(
    filters: { structureType?: StructureType; isActive?: boolean } = {},
    page = 1,
    limit = 20,
  ) {
    return this.salaryStructuresRepo.findAll(filters, page, limit);
  }

  findStructureById(id: string): Promise<SalaryStructure> {
    return this.salaryStructuresRepo.findById(id);
  }

  findStructureWithRules(id: string) {
    return this.salaryStructuresRepo.findWithRules(id);
  }

  createStructure(data: Partial<SalaryStructure>): Promise<SalaryStructure> {
    return this.salaryStructuresRepo.create(data);
  }

  updateStructure(
    id: string,
    version: number,
    data: Partial<SalaryStructure>,
  ): Promise<SalaryStructure> {
    return this.salaryStructuresRepo.update(id, version, data);
  }

  upsertRules(structureId: string, rules: Partial<SalaryRule>[]): Promise<SalaryRule[]> {
    return this.salaryStructuresRepo.upsertRules(structureId, rules);
  }

  removeStructure(id: string): Promise<void> {
    return this.salaryStructuresRepo.softDelete(id);
  }

  structuresDropdown() {
    return this.salaryStructuresRepo.findForDropdown();
  }

  // ─── Payslips ─────────────────────────────────────────────────────────────────

  findAllPayslips(
    branchId: string,
    filters: {
      employeeId?: string;
      status?: PayslipStatus;
      periodFrom?: string;
      periodTo?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    return this.payslipsRepo.findAll(branchId, filters, page, limit);
  }

  findPayslipById(id: string): Promise<Payslip> {
    return this.payslipsRepo.findById(id);
  }

  findPayslipWithLines(id: string) {
    return this.payslipsRepo.findWithLines(id);
  }

  createPayslip(data: Partial<Payslip>): Promise<Payslip> {
    return this.payslipsRepo.create(data);
  }

  updatePayslip(id: string, version: number, data: Partial<Payslip>): Promise<Payslip> {
    return this.payslipsRepo.update(id, version, data);
  }

  upsertPayslipLines(payslipId: string, lines: Partial<PayslipLine>[]): Promise<PayslipLine[]> {
    return this.payslipsRepo.upsertLines(payslipId, lines);
  }

  confirmPayslip(id: string): Promise<Payslip> {
    return this.payslipsRepo.confirm(id);
  }

  cancelPayslip(id: string): Promise<Payslip> {
    return this.payslipsRepo.cancel(id);
  }

  removePayslip(id: string): Promise<void> {
    return this.payslipsRepo.softDelete(id);
  }
}
