import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobTitle } from '@/database/sql/entities/job-title.entity';

@Injectable()
export class JobTitlesRepository {
  constructor(
    @InjectRepository(JobTitle)
    private readonly repo: Repository<JobTitle>,
  ) {}

  async findAll(
    isActive?: boolean,
    page = 1,
    limit = 50,
  ): Promise<{ data: JobTitle[]; total: number; page: number; limit: number; totalPages: number }> {
    const qb = this.repo.createQueryBuilder('jt').where('jt.deleted_at IS NULL');

    if (isActive !== undefined) {
      qb.andWhere('jt.is_active = :isActive', { isActive });
    }

    const [data, total] = await qb
      .orderBy('jt.name_en', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<JobTitle> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Job title not found', ar: 'المسمى الوظيفي غير موجود' });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<JobTitle | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<JobTitle>, ..._opts: any[]): Promise<JobTitle> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<JobTitle>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<JobTitle> {
    const entity = await this.findById(id);
    const data: Partial<JobTitle> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async findForDropdown(
    ..._opts: any[]
  ): Promise<{ id: string; nameEn: string; nameAr: string }[]> {
    return this.repo
      .createQueryBuilder('jt')
      .select(['jt.id AS "id"', 'jt.name_en AS "nameEn"', 'jt.name_ar AS "nameAr"'])
      .where('jt.deleted_at IS NULL')
      .andWhere('jt.is_active = true')
      .orderBy('jt.name_en')
      .getRawMany();
  }
}
