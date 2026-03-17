import { Injectable } from '@nestjs/common';
import { SalaryStructuresRepository } from '@/database/sql/repositories/salary-structures.repository';
import { SalaryRulesRepository } from '@/database/sql/repositories/salary-rules.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateSalaryStructureDto } from '../dto/create-salary-structure.dto';
import { UpdateSalaryStructureDto } from '../dto/update-salary-structure.dto';
import { CreateSalaryRuleDto } from '../dto/create-salary-rule.dto';
import { UpdateSalaryRuleDto } from '../dto/update-salary-rule.dto';

@Injectable()
export class SalaryStructuresService {
  constructor(
    private readonly salaryStructuresRepository: SalaryStructuresRepository,
    private readonly salaryRulesRepository: SalaryRulesRepository,
  ) {}

  // ── Salary Structures ─────────────────────────────────────────────────────

  async findAll(tenantId: string, query: PaginationDto) {
    return this.salaryStructuresRepository.findAll({
      ...query,
      tenantId,
      searchFields: ['nameEn', 'nameAr'],
    });
  }

  async findById(tenantId: string, id: string) {
    return this.salaryStructuresRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateSalaryStructureDto, auditContext: AuditContext) {
    return this.salaryStructuresRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSalaryStructureDto,
    auditContext: AuditContext,
  ) {
    return this.salaryStructuresRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  async delete(tenantId: string, id: string, auditContext: AuditContext) {
    return this.salaryStructuresRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Salary Rules (nested under a structure) ───────────────────────────────

  async findRulesByStructure(tenantId: string, structureId: string) {
    // Validate that the structure exists and belongs to this tenant
    await this.salaryStructuresRepository.findById(structureId, { tenantId });

    return this.salaryRulesRepository.findAllRaw({
      where: { structureId },
      tenantId,
      order: [['sequence', 'ASC']],
    });
  }

  async createRule(
    tenantId: string,
    structureId: string,
    dto: CreateSalaryRuleDto,
    auditContext: AuditContext,
  ) {
    // Validate that the structure exists and belongs to this tenant
    await this.salaryStructuresRepository.findById(structureId, { tenantId });

    return this.salaryRulesRepository.create({ ...dto, structureId } as any, {
      tenantId,
      auditContext,
    });
  }

  async updateRule(
    tenantId: string,
    ruleId: string,
    dto: UpdateSalaryRuleDto,
    auditContext: AuditContext,
  ) {
    return this.salaryRulesRepository.update(ruleId, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  async deleteRule(tenantId: string, ruleId: string, auditContext: AuditContext) {
    return this.salaryRulesRepository.softDelete(ruleId, { tenantId, auditContext });
  }
}
