import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmStage } from '@/database/sql/entities/crm-stage.entity';
import { CrmStageType } from '@/common/enums/crm.enums';

@Injectable()
export class CrmStagesRepository {
  constructor(
    @InjectRepository(CrmStage)
    private readonly repo: Repository<CrmStage>,
  ) {}

  async findAll(stageType?: CrmStageType, isActive?: boolean): Promise<CrmStage[]> {
    const qb = this.repo.createQueryBuilder('cs').where('cs.deleted_at IS NULL');

    if (stageType !== undefined) qb.andWhere('cs.stage_type = :t', { t: stageType });
    if (isActive !== undefined) qb.andWhere('cs.is_active = :a', { a: isActive });

    const rows = await qb.orderBy('cs.sequence', 'ASC').getMany();
    return rows as CrmStage[];
  }

  async findById(id: string, ..._opts: any[]): Promise<CrmStage> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) {
      throw new NotFoundException({ en: 'CRM stage not found', ar: 'مرحلة CRM غير موجودة' });
    }
    return e;
  }

  async create(data: Partial<CrmStage>, ..._opts: any[]): Promise<CrmStage> {
    const entity = this.repo.create(data as CrmStage);
    return this.repo.save(entity) as unknown as Promise<CrmStage>;
  }

  async update(
    id: string,
    version: number,
    data: Partial<CrmStage>,
    ..._opts: any[]
  ): Promise<CrmStage> {
    const e = await this.findById(id);
    if (e.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(e, data);
    return this.repo.save(e) as unknown as Promise<CrmStage>;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(..._opts: any[]) {
    return this.repo
      .createQueryBuilder('cs')
      .select(['cs.id', 'cs.name_en AS "nameEn"', 'cs.name_ar AS "nameAr"', 'cs.sequence'])
      .where('cs.deleted_at IS NULL')
      .andWhere('cs.is_active = true')
      .orderBy('cs.sequence', 'ASC')
      .getRawMany();
  }
}
