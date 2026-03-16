import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '@/database/sql/entities/tenant.entity';
import { TenantStatus } from '@/common/enums/tenant.enums';

@Injectable()
export class TenantsRepository {
  constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}

  async findAll(
    filters: { search?: string; status?: TenantStatus; planId?: string; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('t').where('t.deleted_at IS NULL');

    if (filters.search) {
      qb.andWhere(
        '(t.name_en ILIKE :s OR t.name_ar ILIKE :s OR t.slug ILIKE :s OR t.email ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }
    if (filters.searchFields && filters.search) {
      // Already handled above — ignore searchFields
    }
    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.planId) {
      qb.andWhere('t.plan_id = :planId', { planId: filters.planId });
    }

    const sortBy = filters.sortBy ?? 'created_at';
    const sortOrder: 'ASC' | 'DESC' =
      (filters.sortOrder as 'ASC' | 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    const safeSort = ['created_at', 'name_en', 'name_ar', 'slug', 'status'].includes(sortBy)
      ? sortBy
      : 'created_at';

    const pageNum = filters.page ?? page;
    const limitNum = filters.limit ?? limit;

    const [data, total] = await qb
      .orderBy(`t.${safeSort}`, sortOrder)
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return {
      data,
      rows: data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findById(id: string): Promise<Tenant> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException({ en: 'Tenant not found', ar: 'المستأجر غير موجود' });
    }
    return entity;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug, deletedAt: null as any } });
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.slug = :slug', { slug })
      .andWhere('t.deleted_at IS NULL');

    if (excludeId) {
      qb.andWhere('t.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async create(data: Partial<Tenant>, ..._opts: any[]): Promise<Tenant> {
    const entity = this.repo.create(data as Tenant);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    versionOrData: number | Partial<Tenant>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<Tenant> {
    const entity = await this.findById(id);
    const data: Partial<Tenant> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async getDropdown(
    filters: { search?: string; limit?: number } = {},
  ): Promise<{ id: string; nameEn: string; nameAr: string; slug: string }[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .select(['t.id AS id', 't.name_en AS "nameEn"', 't.name_ar AS "nameAr"', 't.slug AS slug'])
      .where('t.deleted_at IS NULL')
      .andWhere('t.status != :cancelled', { cancelled: TenantStatus.CANCELLED });

    if (filters.search) {
      qb.andWhere('(t.name_en ILIKE :s OR t.name_ar ILIKE :s OR t.slug ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }

    qb.orderBy('t.name_en', 'ASC').limit(filters.limit ?? 50);

    return qb.getRawMany();
  }

  async findForDropdown(): Promise<{ id: string; nameEn: string; nameAr: string; slug: string }[]> {
    return this.getDropdown();
  }

  async updateStatus(id: string, status: TenantStatus): Promise<Tenant> {
    const entity = await this.findById(id);
    entity.status = status;
    return this.repo.save(entity);
  }
}
