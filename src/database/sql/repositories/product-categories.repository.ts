import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from '@/database/sql/entities/product-category.entity';

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @InjectRepository(ProductCategory) private readonly repo: Repository<ProductCategory>,
  ) {}

  async findAll(search?: string, page = 1, limit = 20) {
    const qb = this.repo.createQueryBuilder('c').where('c.deleted_at IS NULL');
    if (search) qb.andWhere('(c.name_en ILIKE :s OR c.name_ar ILIKE :s)', { s: `%${search}%` });
    const [data, total] = await qb
      .orderBy('c.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<ProductCategory> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Category not found', ar: 'التصنيف غير موجود' });
    return e;
  }

  async create(data: Partial<ProductCategory>, ..._opts: any[]): Promise<ProductCategory> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<ProductCategory>,
    ..._opts: any[]
  ): Promise<ProductCategory> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
  async findForDropdown(..._opts: any[]) {
    return this.repo
      .createQueryBuilder('c')
      .select(['c.id', 'c.name_en AS "nameEn"', 'c.name_ar AS "nameAr"'])
      .where('c.deleted_at IS NULL')
      .andWhere('c.is_active = true')
      .orderBy('c.name_en')
      .getRawMany();
  }
}
