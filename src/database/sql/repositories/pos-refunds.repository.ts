import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosRefund } from '@/database/sql/entities/pos-refund.entity';

@Injectable()
export class PosRefundsRepository {
  constructor(
    @InjectRepository(PosRefund)
    private readonly repo: Repository<PosRefund>,
  ) {}

  async findAll(branchIdOrFilters: string | any, page = 1, limit = 20) {
    const branchId =
      typeof branchIdOrFilters === 'string'
        ? branchIdOrFilters
        : (branchIdOrFilters?.branchId ?? null);
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
    }

    const qb = this.repo.createQueryBuilder('pr').where('pr.deleted_at IS NULL');
    if (branchId) qb.andWhere('pr.branch_id = :branchId', { branchId });

    const [data, total] = await qb
      .orderBy('pr.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PosRefund> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Refund not found', ar: 'الاسترداد غير موجود' });
    }
    return entity;
  }

  async findOne(opts: any): Promise<PosRefund | null> {
    const where = opts?.where ?? opts;
    return this.repo.findOne({ where: where as any });
  }

  async create(data: Partial<PosRefund>, ..._opts: any[]): Promise<PosRefund> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  // ── Legacy compatibility shims ───────────────────────────────────────────────
  async createTransaction(..._args: any[]): Promise<any> {
    return { commit: async () => {}, rollback: async () => {} };
  }

  async rawQuery<T = any>(..._args: any[]): Promise<T> {
    return [] as unknown as T;
  }
}
