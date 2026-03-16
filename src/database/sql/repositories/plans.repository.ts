import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '@/database/sql/entities/plan.entity';

@Injectable()
export class PlansRepository {
  constructor(@InjectRepository(Plan) private readonly repo: Repository<Plan>) {}

  async findAll(isActive?: boolean): Promise<Plan[]> {
    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');
    if (isActive !== undefined) {
      qb.andWhere('p.is_active = :isActive', { isActive });
    }
    return qb.orderBy('p.sort_order', 'ASC').getMany();
  }

  async findAllRaw(
    opts: { where?: Partial<Plan>; order?: [string, string][] } = {},
  ): Promise<Plan[]> {
    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');

    if (opts.where) {
      if ((opts.where as any).isActive !== undefined) {
        qb.andWhere('p.is_active = :isActive', { isActive: (opts.where as any).isActive });
      }
    }

    if (opts.order) {
      for (const [col, dir] of opts.order) {
        const safeCol = ['sort_order', 'sortOrder', 'created_at', 'name_en'].includes(col)
          ? col === 'sortOrder'
            ? 'sort_order'
            : col
          : 'sort_order';
        qb.addOrderBy(`p.${safeCol}`, dir === 'ASC' ? 'ASC' : 'DESC');
      }
    } else {
      qb.orderBy('p.sort_order', 'ASC');
    }

    return qb.getMany();
  }

  async findById(id: string): Promise<Plan> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException({ en: 'Plan not found', ar: 'الخطة غير موجودة' });
    }
    return entity;
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    return this.repo.findOne({ where: { slug, deletedAt: null as any } });
  }

  async findByCode(code: string): Promise<Plan | null> {
    return this.findBySlug(code);
  }

  async create(data: Partial<Plan>, ..._opts: any[]): Promise<Plan> {
    const entity = this.repo.create(data as Plan);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    versionOrData: number | Partial<Plan>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<Plan> {
    const entity = await this.findById(id);
    const data: Partial<Plan> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async hardDelete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findForDropdown(): Promise<{ id: string; nameEn: string; nameAr: string; slug: string }[]> {
    return this.repo
      .createQueryBuilder('p')
      .select(['p.id AS id', 'p.name_en AS "nameEn"', 'p.name_ar AS "nameAr"', 'p.slug AS slug'])
      .where('p.deleted_at IS NULL')
      .andWhere('p.is_active = true')
      .orderBy('p.sort_order', 'ASC')
      .getRawMany();
  }
}
