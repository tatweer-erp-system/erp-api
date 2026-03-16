import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BankReconciliation } from '@/database/sql/entities/bank-reconciliation.entity';
import { ReconciliationStatus } from '@/common/enums/treasury.enums';

@Injectable()
export class BankReconciliationsRepository {
  constructor(
    @InjectRepository(BankReconciliation)
    private readonly repo: Repository<BankReconciliation>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    branchId: string,
    accountId?: string,
    status?: ReconciliationStatus,
    page = 1,
    limit = 20,
  ): Promise<{
    data: BankReconciliation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('br')
      .where('br.deleted_at IS NULL')
      .andWhere('br.branch_id = :branchId', { branchId });

    if (accountId) {
      qb.andWhere('br.account_id = :accountId', { accountId });
    }
    if (status) {
      qb.andWhere('br.status = :status', { status });
    }

    const [data, total] = await qb
      .orderBy('br.statement_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<BankReconciliation> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({
        en: 'Bank reconciliation not found',
        ar: 'تسوية بنكية غير موجودة',
      });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<BankReconciliation | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<BankReconciliation>, ..._opts: any[]): Promise<BankReconciliation> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<BankReconciliation>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<BankReconciliation> {
    const entity = await this.findById(id);
    const data: Partial<BankReconciliation> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async reconcile(id: string, reconciledBy: string, ..._opts: any[]): Promise<BankReconciliation> {
    const entity = await this.findById(id);
    entity.status = ReconciliationStatus.RECONCILED;
    entity.reconciledBy = reconciledBy;
    entity.reconciledAt = new Date();
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
  async findOne(opts: any): Promise<BankReconciliation | null> {
    const where = opts?.where ?? {};
    return this.repo.findOne({ where } as any);
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
