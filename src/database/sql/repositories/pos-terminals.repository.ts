import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosTerminal } from '@/database/sql/entities/pos-terminal.entity';

@Injectable()
export class PosTerminalsRepository {
  constructor(
    @InjectRepository(PosTerminal)
    private readonly repo: Repository<PosTerminal>,
  ) {}

  async findAll(branchIdOrFilters: string | any, filters: any = {}, page = 1, limit = 20) {
    const branchId =
      typeof branchIdOrFilters === 'string'
        ? branchIdOrFilters
        : (branchIdOrFilters?.branchId ?? null);
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
    }

    const qb = this.repo.createQueryBuilder('pt').where('pt.deleted_at IS NULL');
    if (branchId) qb.andWhere('pt.branch_id = :branchId', { branchId });

    const [data, total] = await qb
      .orderBy('pt.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PosTerminal> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Terminal not found', ar: 'الطرفية غير موجودة' });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<PosTerminal | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<PosTerminal>, ..._opts: any[]): Promise<PosTerminal> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(id: string, data: Partial<PosTerminal>, ..._opts: any[]): Promise<PosTerminal> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
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
