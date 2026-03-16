import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmploymentType } from '@/database/sql/entities/employment-type.entity';

@Injectable()
export class EmploymentTypesRepository {
  constructor(
    @InjectRepository(EmploymentType)
    private readonly repo: Repository<EmploymentType>,
  ) {}

  async findAll(
    isActive?: boolean,
    page = 1,
    limit = 50,
  ): Promise<{
    data: EmploymentType[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo.createQueryBuilder('et').where('et.deleted_at IS NULL');

    if (isActive !== undefined) {
      qb.andWhere('et.is_active = :isActive', { isActive });
    }

    const [data, total] = await qb
      .orderBy('et.name_en', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<EmploymentType> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({
        en: 'Employment type not found',
        ar: 'نوع التوظيف غير موجود',
      });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<EmploymentType | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<EmploymentType>, ..._opts: any[]): Promise<EmploymentType> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<EmploymentType>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<EmploymentType> {
    const entity = await this.findById(id);
    const data: Partial<EmploymentType> =
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
      .createQueryBuilder('et')
      .select(['et.id AS "id"', 'et.name_en AS "nameEn"', 'et.name_ar AS "nameAr"'])
      .where('et.deleted_at IS NULL')
      .andWhere('et.is_active = true')
      .orderBy('et.name_en')
      .getRawMany();
  }
}
