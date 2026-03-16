import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from '@/database/sql/entities/currency.entity';

@Injectable()
export class CurrenciesRepository {
  constructor(@InjectRepository(Currency) private readonly repo: Repository<Currency>) {}

  async findAll(isActive?: boolean) {
    const qb = this.repo.createQueryBuilder('c').where('c.deleted_at IS NULL');
    if (isActive !== undefined) qb.andWhere('c.is_active = :a', { a: isActive });
    return qb.orderBy('c.code').getMany();
  }

  async findById(id: string, ..._opts: any[]): Promise<Currency> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Currency not found', ar: 'العملة غير موجودة' });
    return e;
  }

  async findByCode(code: string): Promise<Currency | null> {
    return this.repo.findOne({ where: { code } as any });
  }

  async create(data: Partial<Currency>, ..._opts: any[]): Promise<Currency> {
    const entity = this.repo.create(data as unknown as Currency);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<Currency>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<Currency> {
    const e = await this.findById(id);
    const data: Partial<Currency> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown() {
    return this.repo
      .createQueryBuilder('c')
      .select(['c.id', 'c.code', 'c.name_en AS "nameEn"', 'c.name_ar AS "nameAr"', 'c.symbol'])
      .where('c.deleted_at IS NULL')
      .andWhere('c.is_active = true')
      .orderBy('c.code')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findAllRaw(..._args: any[]): Promise<any[]> {
    return [];
  }
  async findOne(opts: any): Promise<any> {
    return this.repo.findOne(opts);
  }
  async bulkUpdate(..._args: any[]): Promise<void> {}
}
