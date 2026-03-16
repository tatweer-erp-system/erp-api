import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from '@/database/sql/entities/partner.entity';
import { PartnerType } from '@/common/enums/inventory.enums';

@Injectable()
export class PartnersRepository {
  constructor(@InjectRepository(Partner) private readonly repo: Repository<Partner>) {}

  async findAll(
    filters: {
      search?: string;
      type?: PartnerType;
      isCustomer?: boolean;
      isSupplier?: boolean;
      isActive?: boolean;
      [key: string]: any;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');
    if (filters.search)
      qb.andWhere(
        '(p.name_en ILIKE :s OR p.name_ar ILIKE :s OR p.phone ILIKE :s OR p.email ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    if (filters.type) qb.andWhere('p.type = :type', { type: filters.type });
    if (filters.isCustomer !== undefined)
      qb.andWhere('p.is_customer = :c', { c: filters.isCustomer });
    if (filters.isSupplier !== undefined)
      qb.andWhere('p.is_supplier = :sup', { sup: filters.isSupplier });
    if (filters.isActive !== undefined) qb.andWhere('p.is_active = :a', { a: filters.isActive });
    const [data, total] = await qb
      .orderBy('p.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Partner> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Partner not found', ar: 'الشريك غير موجود' });
    return e;
  }

  async create(data: Partial<Partner>, ..._opts: any[]): Promise<Partner> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Partner>,
    ..._opts: any[]
  ): Promise<Partner> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(isCustomerOrTenant?: any, isSupplierOrOpts?: any, ..._opts: any[]) {
    const isCustomer = typeof isCustomerOrTenant === 'boolean' ? isCustomerOrTenant : undefined;
    const isSupplier = typeof isSupplierOrOpts === 'boolean' ? isSupplierOrOpts : undefined;
    const qb = this.repo
      .createQueryBuilder('p')
      .select(['p.id', 'p.name_en AS "nameEn"', 'p.name_ar AS "nameAr"', 'p.phone', 'p.email'])
      .where('p.deleted_at IS NULL')
      .andWhere('p.is_active = true');
    if (isCustomer) qb.andWhere('p.is_customer = true');
    if (isSupplier) qb.andWhere('p.is_supplier = true');
    return qb.orderBy('p.name_en').getRawMany();
  }
}
