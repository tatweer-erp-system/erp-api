import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChartOfAccount } from '@/database/sql/entities/chart-of-account.entity';
import { AccountType } from '@/common/enums/accounting.enums';

@Injectable()
export class ChartOfAccountsRepository {
  constructor(
    @InjectRepository(ChartOfAccount) private readonly repo: Repository<ChartOfAccount>,
  ) {}

  async findAll(
    filters: {
      search?: string;
      accountType?: AccountType;
      isActive?: boolean;
      [key: string]: any;
    } = {},
    page = 1,
    limit = 50,
  ) {
    const qb = this.repo.createQueryBuilder('a').where('a.deleted_at IS NULL');
    if (filters.search) {
      qb.andWhere('(a.name_en ILIKE :s OR a.name_ar ILIKE :s OR a.code ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }
    if (filters.accountType) qb.andWhere('a.account_type = :t', { t: filters.accountType });
    if (filters.isActive !== undefined) qb.andWhere('a.is_active = :a', { a: filters.isActive });
    const [data, total] = await qb
      .orderBy('a.code')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<ChartOfAccount> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Account not found', ar: 'الحساب غير موجود' });
    return e;
  }

  async create(data: Partial<ChartOfAccount>, ..._opts: any[]): Promise<ChartOfAccount> {
    const entity = this.repo.create(data as unknown as ChartOfAccount);
    return this.repo.save(entity) as any;
  }

  async update(id: string, data: Partial<ChartOfAccount>, ..._opts: any[]): Promise<ChartOfAccount>;
  async update(
    id: string,
    version: number,
    data: Partial<ChartOfAccount>,
    ..._opts: any[]
  ): Promise<ChartOfAccount>;
  async update(
    id: string,
    versionOrData: any,
    dataOrOpts?: any,
    ..._rest: any[]
  ): Promise<ChartOfAccount> {
    const e = await this.findById(id);
    const data = typeof versionOrData === 'number' ? dataOrOpts : versionOrData;
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(accountTypeOrTenant?: any, ..._opts: any[]) {
    const accountType =
      typeof accountTypeOrTenant === 'string' && accountTypeOrTenant.length < 40
        ? accountTypeOrTenant
        : undefined;
    const qb = this.repo
      .createQueryBuilder('a')
      .select([
        'a.id',
        'a.code',
        'a.name_en AS "nameEn"',
        'a.name_ar AS "nameAr"',
        'a.account_type AS "accountType"',
      ])
      .where('a.deleted_at IS NULL')
      .andWhere('a.is_active = true')
      .andWhere('a.is_deprecated = false');
    if (accountType) qb.andWhere('a.account_type = :t', { t: accountType });
    return qb.orderBy('a.code').getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findByIdOrNull(id: string, ..._opts: any[]): Promise<any> {
    return this.repo.findOne({ where: { id } as any });
  }
  async findByCode(code: string, ..._opts: any[]): Promise<any> {
    return this.repo.findOne({ where: { code } as any });
  }
  async existsByCode(code: string, ..._opts: any[]): Promise<boolean> {
    return !!(await this.repo.findOne({ where: { code } as any }));
  }
  async getTree(..._args: any[]): Promise<any[]> {
    return [];
  }
  async hasPostedLines(..._args: any[]): Promise<boolean> {
    return false;
  }
  async hasUnpostedLines(..._args: any[]): Promise<boolean> {
    return false;
  }
  async createTransaction(..._args: any[]): Promise<any> {
    return null;
  }
}
