import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pricelist } from '@/database/sql/entities/pricelist.entity';
import { PricelistItem } from '@/database/sql/entities/pricelist-item.entity';

@Injectable()
export class PricelistsRepository {
  constructor(
    @InjectRepository(Pricelist) private readonly repo: Repository<Pricelist>,
    @InjectRepository(PricelistItem) private readonly itemRepo: Repository<PricelistItem>,
  ) {}

  async findAll(
    searchOrTenantOrFilters?: string | any,
    isActiveOrFilters?: boolean | any,
    page = 1,
    limit = 20,
  ) {
    const search: string | undefined =
      typeof searchOrTenantOrFilters === 'string'
        ? searchOrTenantOrFilters
        : typeof searchOrTenantOrFilters === 'object'
          ? searchOrTenantOrFilters?.search
          : undefined;
    const isActive: boolean | undefined =
      typeof isActiveOrFilters === 'boolean'
        ? isActiveOrFilters
        : typeof searchOrTenantOrFilters === 'object'
          ? searchOrTenantOrFilters?.isActive
          : undefined;
    if (typeof searchOrTenantOrFilters === 'object' && searchOrTenantOrFilters !== null) {
      page = searchOrTenantOrFilters.page ?? page;
      limit = searchOrTenantOrFilters.limit ?? limit;
    }
    const qb = this.repo.createQueryBuilder('pl').where('pl.deleted_at IS NULL');
    if (search) qb.andWhere('(pl.name_en ILIKE :s OR pl.name_ar ILIKE :s)', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('pl.is_active = :a', { a: isActive });
    const [data, total] = await qb
      .orderBy('pl.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Pricelist> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e)
      throw new NotFoundException({ en: 'Pricelist not found', ar: 'قائمة الأسعار غير موجودة' });
    return e;
  }

  async findWithItems(id: string) {
    const pl = await this.findById(id);
    const items = await this.itemRepo.find({ where: { pricelistId: id } as any });
    return { ...pl, items };
  }

  async create(data: Partial<Pricelist>, ..._opts: any[]): Promise<Pricelist> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Pricelist>,
    ..._opts: any[]
  ): Promise<Pricelist> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.itemRepo.softRemove(await this.itemRepo.find({ where: { pricelistId: id } as any }));
    await this.repo.softRemove(await this.findById(id));
  }

  async addItem(data: Partial<PricelistItem>): Promise<PricelistItem> {
    return this.itemRepo.save(this.itemRepo.create(data as any)) as any;
  }
  async updateItem(
    itemId: string,
    versionOrData: number | Partial<PricelistItem>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<PricelistItem> {
    const data: Partial<PricelistItem> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    const e = await this.itemRepo.findOne({ where: { id: itemId } as any });
    if (!e) throw new NotFoundException({ en: 'Item not found', ar: 'البند غير موجود' });
    if (typeof versionOrData === 'number' && e.version !== versionOrData)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.itemRepo.save(e) as any;
  }
  async removeItem(itemId: string): Promise<void> {
    const e = await this.itemRepo.findOne({ where: { id: itemId } as any });
    if (e) await this.itemRepo.softRemove(e);
  }

  async findForDropdown(..._args: any[]) {
    return this.repo
      .createQueryBuilder('pl')
      .select(['pl.id', 'pl.name_en AS "nameEn"', 'pl.name_ar AS "nameAr"'])
      .where('pl.deleted_at IS NULL')
      .andWhere('pl.is_active = true')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async createItem(...args: any[]): Promise<any> {
    const data = args.find((a) => typeof a === 'object' && a !== null) ?? {};
    return this.addItem(data);
  }
  async findItemById(...args: any[]): Promise<any> {
    const itemId = args[args.length - 1];
    return this.itemRepo.findOne({ where: { id: itemId } as any });
  }
  async findItemsByPricelistId(...args: any[]): Promise<any[]> {
    const pricelistId = args[args.length - 1];
    return this.itemRepo.find({ where: { pricelistId } as any });
  }
  async softDeleteItem(...args: any[]): Promise<void> {
    const itemId = args[args.length - 1];
    return this.removeItem(itemId);
  }
  async softDeleteAllItems(...args: any[]): Promise<void> {
    const pricelistId = args[args.length - 1];
    await this.itemRepo.softRemove(await this.itemRepo.find({ where: { pricelistId } as any }));
  }
}
