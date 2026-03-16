import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantSection } from '@/database/sql/entities/restaurant-section.entity';

@Injectable()
export class RestaurantSectionsRepository {
  constructor(
    @InjectRepository(RestaurantSection)
    private readonly repo: Repository<RestaurantSection>,
  ) {}

  async findAll(
    branchId: string,
    isActive?: boolean,
    page = 1,
    limit = 20,
  ): Promise<{
    data: RestaurantSection[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.branch_id = :branchId', { branchId });

    if (isActive !== undefined) {
      qb.andWhere('s.is_active = :isActive', { isActive });
    }

    const [data, total] = await qb
      .orderBy('s.sequence', 'ASC')
      .addOrderBy('s.name_en', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<RestaurantSection> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'Section not found', ar: 'القسم غير موجود' });
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<RestaurantSection | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<RestaurantSection>, ..._opts: any[]): Promise<RestaurantSection> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<RestaurantSection>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<RestaurantSection> {
    const entity = await this.findById(id);
    const data: Partial<RestaurantSection> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async findForDropdown(
    branchId: string,
    ..._opts: any[]
  ): Promise<{ id: string; nameEn: string; nameAr: string }[]> {
    return this.repo
      .createQueryBuilder('s')
      .select(['s.id AS "id"', 's.name_en AS "nameEn"', 's.name_ar AS "nameAr"'])
      .where('s.deleted_at IS NULL')
      .andWhere('s.branch_id = :branchId', { branchId })
      .andWhere('s.is_active = true')
      .orderBy('s.sequence', 'ASC')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOne(opts: any): Promise<RestaurantSection | null> {
    const where = opts?.where ?? {};
    return this.repo.findOne({ where } as any);
  }

  async findAll2(...args: any[]): Promise<any> {
    const opts = args[0] ?? {};
    return this.findAll(opts.branchId ?? opts.tenantId ?? '', undefined, opts.page, opts.limit);
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
