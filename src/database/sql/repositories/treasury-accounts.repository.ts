import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TreasuryAccount } from '@/database/sql/entities/treasury-account.entity';
import { TreasuryAccountType } from '@/common/enums/treasury.enums';

@Injectable()
export class TreasuryAccountsRepository {
  constructor(
    @InjectRepository(TreasuryAccount)
    private readonly repo: Repository<TreasuryAccount>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    branchId: string,
    accountType?: TreasuryAccountType,
    page = 1,
    limit = 20,
  ): Promise<{
    data: TreasuryAccount[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('ta')
      .where('ta.deleted_at IS NULL')
      .andWhere('ta.branch_id = :branchId', { branchId });

    if (accountType) {
      qb.andWhere('ta.account_type = :accountType', { accountType });
    }

    const [data, total] = await qb
      .orderBy('ta.name_en', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<TreasuryAccount> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({
        en: 'Treasury account not found',
        ar: 'حساب الخزينة غير موجود',
      });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<TreasuryAccount | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<TreasuryAccount>, ..._opts: any[]): Promise<TreasuryAccount> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<TreasuryAccount>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<TreasuryAccount> {
    const entity = await this.findById(id);
    const data: Partial<TreasuryAccount> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async updateBalance(id: string, delta: number, ..._opts: any[]): Promise<TreasuryAccount> {
    const entity = await this.findById(id);
    entity.balance = Number(entity.balance) + delta;
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async findForDropdown(
    branchId: string,
    ..._opts: any[]
  ): Promise<{ id: string; nameEn: string; nameAr: string; accountType: string }[]> {
    return this.repo
      .createQueryBuilder('ta')
      .select([
        'ta.id AS "id"',
        'ta.name_en AS "nameEn"',
        'ta.name_ar AS "nameAr"',
        'ta.account_type AS "accountType"',
      ])
      .where('ta.deleted_at IS NULL')
      .andWhere('ta.branch_id = :branchId', { branchId })
      .andWhere('ta.is_active = true')
      .orderBy('ta.name_en')
      .getRawMany();
  }

  // ── Raw query for atomic balance updates ────────────────────────────────────
  async rawQuery<T = any>(
    sql: string,
    params: Record<string, any> = {},
    ..._opts: any[]
  ): Promise<T> {
    // Convert named params (:param) to positional ($1, $2, ...)
    const paramNames: string[] = [];
    const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match: RegExpExecArray | null;
    while ((match = paramRegex.exec(sql)) !== null) {
      if (!paramNames.includes(match[1])) paramNames.push(match[1]);
    }
    let positionalSql = sql;
    paramNames.forEach((name, i) => {
      positionalSql = positionalSql.replace(new RegExp(`:${name}`, 'g'), `$${i + 1}`);
    });
    const values = paramNames.map((name) => params[name]);
    const result = await this.dataSource.query(positionalSql, values);
    return result as T;
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOne(opts: any): Promise<TreasuryAccount | null> {
    const where = opts?.where ?? {};
    return this.repo.findOne({ where } as any);
  }

  async bulkUpdate(opts: any): Promise<void> {
    const { where, data } = opts ?? {};
    if (!data || !where) return;
    await this.repo.createQueryBuilder().update().set(data).where(where).execute();
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
