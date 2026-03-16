import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from '@/database/sql/entities/tax.entity';
import { TaxScope } from '@/common/enums/inventory.enums';

@Injectable()
export class TaxesRepository {
  constructor(@InjectRepository(Tax) private readonly repo: Repository<Tax>) {}

  async findAll(
    filtersOrTenant: { scope?: TaxScope; isActive?: boolean; [key: string]: any } | string = {},
    pageOrFilters: any = 1,
    limitOrPage: any = 20,
  ) {
    const filters: any =
      typeof filtersOrTenant === 'string' ? (pageOrFilters ?? {}) : filtersOrTenant;
    const page =
      typeof filtersOrTenant === 'string'
        ? (limitOrPage ?? 1)
        : typeof pageOrFilters === 'number'
          ? pageOrFilters
          : 1;
    const limit =
      typeof filtersOrTenant === 'string' ? 20 : typeof limitOrPage === 'number' ? limitOrPage : 20;
    const qb = this.repo.createQueryBuilder('t').where('t.deleted_at IS NULL');
    if (filters.scope)
      qb.andWhere('t.scope IN (:...scopes)', { scopes: [filters.scope, TaxScope.BOTH] });
    if (filters.isActive !== undefined) qb.andWhere('t.is_active = :a', { a: filters.isActive });
    const [data, total] = await qb
      .orderBy('t.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Tax> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Tax not found', ar: 'الضريبة غير موجودة' });
    return e;
  }

  async create(data: Partial<Tax>, ..._opts: any[]): Promise<Tax> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(id: string, version: number, data: Partial<Tax>, ..._opts: any[]): Promise<Tax> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
  async findForDropdown(scopeOrTenantId?: any, ..._opts: any[]) {
    const qb = this.repo
      .createQueryBuilder('t')
      .select([
        't.id',
        't.name_en AS "nameEn"',
        't.name_ar AS "nameAr"',
        't.amount',
        't.tax_type AS "taxType"',
      ])
      .where('t.deleted_at IS NULL')
      .andWhere('t.is_active = true');
    const scope =
      typeof scopeOrTenantId === 'string' &&
      (Object.values(TaxScope) as string[]).includes(scopeOrTenantId)
        ? scopeOrTenantId
        : undefined;
    if (scope) qb.andWhere('t.scope IN (:...s)', { s: [scope, TaxScope.BOTH] });
    return qb.getRawMany();
  }
}
