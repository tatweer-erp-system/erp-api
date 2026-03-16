import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryStructure } from '@/database/sql/entities/salary-structure.entity';
import { SalaryRule } from '@/database/sql/entities/salary-rule.entity';
import { StructureType } from '@/common/enums/payroll.enums';

@Injectable()
export class SalaryStructuresRepository {
  constructor(
    @InjectRepository(SalaryStructure)
    private readonly repo: Repository<SalaryStructure>,
    @InjectRepository(SalaryRule)
    private readonly ruleRepo: Repository<SalaryRule>,
  ) {}

  async findAll(
    filters: { structureType?: StructureType; isActive?: boolean; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('ss').where('ss.deleted_at IS NULL');

    if (filters.structureType !== undefined) {
      qb.andWhere('ss.structure_type = :t', { t: filters.structureType });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('ss.is_active = :a', { a: filters.isActive });
    }

    const result = await qb
      .orderBy('ss.name_en', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const data = result[0] as SalaryStructure[];
    const total = result[1] as number;

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<SalaryStructure> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) {
      throw new NotFoundException({
        en: 'Salary structure not found',
        ar: 'هيكل الراتب غير موجود',
      });
    }
    return e;
  }

  async findWithRules(id: string) {
    const structure = await this.findById(id);
    const rules = await this.ruleRepo.find({
      where: { structureId: id } as any,
      order: { sequence: 'ASC' as const },
    });
    return { ...structure, rules };
  }

  async create(data: Partial<SalaryStructure>, ..._opts: any[]): Promise<SalaryStructure> {
    const entity = this.repo.create(data as SalaryStructure);
    return this.repo.save(entity) as unknown as Promise<SalaryStructure>;
  }

  async update(
    id: string,
    version: number,
    data: Partial<SalaryStructure>,
  ): Promise<SalaryStructure> {
    const e = await this.findById(id);
    if (e.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(e, data);
    return this.repo.save(e) as unknown as Promise<SalaryStructure>;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async upsertRules(structureId: string, rules: Partial<SalaryRule>[]): Promise<SalaryRule[]> {
    await this.ruleRepo.delete({ structureId } as any);
    if (!rules.length) return [];
    const entities = rules.map((r, i) =>
      this.ruleRepo.create({ ...r, structureId, sequence: r.sequence ?? i * 10 } as SalaryRule),
    );
    return this.ruleRepo.save(entities) as unknown as Promise<SalaryRule[]>;
  }

  async findForDropdown(..._opts: any[]) {
    return this.repo
      .createQueryBuilder('ss')
      .select(['ss.id', 'ss.name_en AS "nameEn"', 'ss.name_ar AS "nameAr"'])
      .where('ss.deleted_at IS NULL')
      .andWhere('ss.is_active = true')
      .orderBy('ss.name_en', 'ASC')
      .getRawMany();
  }
}
