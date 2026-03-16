import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosSession } from '@/database/sql/entities/pos-session.entity';
import { PosSessionStatus } from '@/common/enums/pos.enums';

@Injectable()
export class PosSessionsRepository {
  constructor(
    @InjectRepository(PosSession)
    private readonly repo: Repository<PosSession>,
  ) {}

  async findAll(
    branchIdOrFilters: string | any,
    filters: { cashierId?: string; status?: PosSessionStatus } = {},
    page = 1,
    limit = 20,
  ) {
    const branchId =
      typeof branchIdOrFilters === 'string'
        ? branchIdOrFilters
        : (branchIdOrFilters?.branchId ?? null);
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
      if (branchIdOrFilters.where?.cashierId) filters.cashierId = branchIdOrFilters.where.cashierId;
      if (branchIdOrFilters.where?.status) filters.status = branchIdOrFilters.where.status;
    }

    const qb = this.repo.createQueryBuilder('ps').where('ps.deleted_at IS NULL');

    if (branchId) qb.andWhere('ps.branch_id = :branchId', { branchId });
    if (filters.cashierId)
      qb.andWhere('ps.cashier_id = :cashierId', { cashierId: filters.cashierId });
    if (filters.status) qb.andWhere('ps.status = :status', { status: filters.status });

    const [data, total] = await qb
      .orderBy('ps.opened_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PosSession> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({
        en: 'POS session not found',
        ar: 'جلسة نقطة البيع غير موجودة',
      });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<PosSession | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findOne(opts: any): Promise<PosSession | null> {
    const where = opts?.where ?? opts;
    return this.repo.findOne({ where: where as any });
  }

  async findOpen(cashierId: string, branchId: string): Promise<PosSession | null> {
    return this.repo.findOne({
      where: { cashierId, branchId, status: PosSessionStatus.OPEN } as any,
    });
  }

  async create(data: Partial<PosSession>, ..._opts: any[]): Promise<PosSession> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(id: string, data: Partial<PosSession>, ..._opts: any[]): Promise<PosSession> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async close(
    id: string,
    closingData: {
      closingBalance?: number;
      closingFloat?: number;
      expectedFloat?: number;
      floatDifference?: number;
      notes?: string;
    },
    ..._opts: any[]
  ): Promise<PosSession> {
    const entity = await this.findById(id);
    entity.status = PosSessionStatus.CLOSED;
    entity.closedAt = new Date();
    if (closingData.closingBalance !== undefined)
      entity.closingBalance = closingData.closingBalance;
    if (closingData.closingFloat !== undefined) entity.closingFloat = closingData.closingFloat;
    if (closingData.expectedFloat !== undefined) entity.expectedFloat = closingData.expectedFloat;
    if (closingData.floatDifference !== undefined)
      entity.floatDifference = closingData.floatDifference;
    if (closingData.notes !== undefined) entity.notes = closingData.notes;
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
