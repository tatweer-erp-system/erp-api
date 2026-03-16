import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '@/database/sql/entities/warehouse.entity';

@Injectable()
export class WarehousesRepository {
  constructor(@InjectRepository(Warehouse) private readonly repo: Repository<Warehouse>) {}

  async findAll(
    branchIdOrFilters: string | any,
    searchOrFilters?: string | any,
    isActive?: boolean,
    page = 1,
    limit = 20,
  ) {
    const branchId =
      typeof branchIdOrFilters === 'string'
        ? branchIdOrFilters
        : (branchIdOrFilters?.branchId ?? '');
    const search = typeof searchOrFilters === 'string' ? searchOrFilters : searchOrFilters?.search;
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
    }
    const qb = this.repo
      .createQueryBuilder('w')
      .where('w.deleted_at IS NULL')
      .andWhere('w.branch_id = :branchId', { branchId });

    if (search) {
      qb.andWhere('(w.name_en ILIKE :s OR w.name_ar ILIKE :s OR w.short_name ILIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (isActive !== undefined) {
      qb.andWhere('w.is_active = :isActive', { isActive });
    }

    const [data, total] = await qb
      .orderBy('w.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Warehouse> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity)
      throw new NotFoundException({ en: 'Warehouse not found', ar: 'المستودع غير موجود' });
    return entity;
  }

  async create(data: Partial<Warehouse>, ..._opts: any[]): Promise<Warehouse> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Warehouse>,
    ..._opts: any[]
  ): Promise<Warehouse> {
    const entity = await this.findById(id);
    if (entity.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(
    branchId: string,
    ..._opts: any[]
  ): Promise<{ id: string; nameEn: string; nameAr: string; shortName: string }[]> {
    return this.repo
      .createQueryBuilder('w')
      .select([
        'w.id',
        'w.name_en AS "nameEn"',
        'w.name_ar AS "nameAr"',
        'w.short_name AS "shortName"',
      ])
      .where('w.deleted_at IS NULL')
      .andWhere('w.is_active = true')
      .andWhere('w.branch_id = :branchId', { branchId })
      .orderBy('w.name_en')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findDefault(branchId: string): Promise<any> {
    return this.repo.findOne({ where: { branchId, isDefault: true } as any });
  }
}
