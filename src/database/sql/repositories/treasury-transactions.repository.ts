import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TreasuryTransaction } from '@/database/sql/entities/treasury-transaction.entity';
import { TreasuryTransactionType } from '@/common/enums/treasury.enums';

@Injectable()
export class TreasuryTransactionsRepository {
  constructor(
    @InjectRepository(TreasuryTransaction)
    private readonly repo: Repository<TreasuryTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      accountId?: string;
      transactionType?: TreasuryTransactionType;
      dateFrom?: string;
      dateTo?: string;
    } = {},
    page = 1,
    limit = 20,
  ): Promise<{
    data: TreasuryTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('tt')
      .where('tt.deleted_at IS NULL')
      .andWhere('tt.branch_id = :branchId', { branchId });

    if (filters.accountId) {
      qb.andWhere('tt.account_id = :accountId', { accountId: filters.accountId });
    }
    if (filters.transactionType) {
      qb.andWhere('tt.transaction_type = :transactionType', {
        transactionType: filters.transactionType,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('tt.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('tt.date <= :dateTo', { dateTo: filters.dateTo });
    }

    const [data, total] = await qb
      .orderBy('tt.date', 'DESC')
      .addOrderBy('tt.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<TreasuryTransaction> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({
        en: 'Treasury transaction not found',
        ar: 'حركة الخزينة غير موجودة',
      });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<TreasuryTransaction | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<TreasuryTransaction>, ..._opts: any[]): Promise<TreasuryTransaction> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  // ── Raw query support ────────────────────────────────────────────────────────
  async rawQuery<T = any>(
    sql: string,
    params: Record<string, any> = {},
    ..._opts: any[]
  ): Promise<T> {
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
  async findOne(opts: any): Promise<TreasuryTransaction | null> {
    const where = opts?.where ?? {};
    return this.repo.findOne({ where } as any);
  }

  async findAllRaw(opts: any): Promise<TreasuryTransaction[]> {
    const where = opts?.where ?? {};
    return this.repo.find({ where } as any);
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
