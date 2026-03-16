import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@/database/sql/entities/product.entity';
import { ProductType } from '@/common/enums/inventory.enums';

@Injectable()
export class ProductsRepository {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  async findAll(
    filtersOrTenant:
      | {
          search?: string;
          type?: ProductType;
          categoryId?: string;
          isActive?: boolean;
          [key: string]: any;
        }
      | string = {},
    pageOrFilters: any = 1,
    limitOrPage: any = 20,
  ) {
    const filters: any =
      typeof filtersOrTenant === 'string' ? (pageOrFilters ?? {}) : filtersOrTenant;
    let page =
      typeof filtersOrTenant === 'string'
        ? (limitOrPage ?? 1)
        : typeof pageOrFilters === 'number'
          ? pageOrFilters
          : 1;
    const limit =
      typeof filtersOrTenant === 'string' ? 20 : typeof limitOrPage === 'number' ? limitOrPage : 20;
    if (filters.offset !== undefined && page === 1) page = Math.floor(filters.offset / limit) + 1;
    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');
    if (filters.search)
      qb.andWhere(
        '(p.name_en ILIKE :s OR p.name_ar ILIKE :s OR p.reference ILIKE :s OR p.barcode ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    if (filters.type) qb.andWhere('p.type = :type', { type: filters.type });
    if (filters.categoryId) qb.andWhere('p.category_id = :cat', { cat: filters.categoryId });
    if (filters.isActive !== undefined) qb.andWhere('p.is_active = :a', { a: filters.isActive });
    const [data, total] = await qb
      .orderBy('p.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Product> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Product not found', ar: 'المنتج غير موجود' });
    return e;
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.repo.findOne({ where: { barcode } as any });
  }

  async create(data: Partial<Product>, ..._opts: any[]): Promise<Product> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Product>,
    ..._opts: any[]
  ): Promise<Product> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(typeOrOpts?: any, ..._opts: any[]) {
    const type = typeof typeOrOpts === 'string' ? typeOrOpts : undefined;
    const qb = this.repo
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.name_en AS "nameEn"',
        'p.name_ar AS "nameAr"',
        'p.reference',
        'p.type',
        'p.sale_price AS "salePrice"',
      ])
      .where('p.deleted_at IS NULL')
      .andWhere('p.is_active = true');
    if (type) qb.andWhere('p.type = :type', { type });
    return qb.orderBy('p.name_en').getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findByIdOrNull(...args: any[]): Promise<any> {
    const id = args[args.length - 1];
    return this.repo.findOne({ where: { id } as any });
  }
  async findByIdIncludingDeleted(id: string): Promise<any> {
    return this.repo.createQueryBuilder('p').where('p.id = :id', { id }).getOne();
  }
  async findNameById(..._args: any[]): Promise<any> {
    return null;
  }
  async findProductReorderInfo(..._args: any[]): Promise<any> {
    return null;
  }
  async findExistingByIds(..._args: any[]): Promise<any[]> {
    return [];
  }
  async findExistingBySku(..._args: any[]): Promise<any> {
    return null;
  }
  async findExistingBySkus(..._args: any[]): Promise<any[]> {
    return [];
  }
  async getTransaction(..._args: any[]): Promise<any> {
    return null;
  }
  async restore(...args: any[]): Promise<void> {
    await this.repo.restore(args[args.length - 1]);
  }
}
