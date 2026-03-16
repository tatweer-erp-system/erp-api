import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosCashier } from '@/database/sql/entities/pos-cashier.entity';

@Injectable()
export class PosCashiersRepository {
  constructor(
    @InjectRepository(PosCashier)
    private readonly repo: Repository<PosCashier>,
  ) {}

  async findAll(branchIdOrFilters: string | any, page = 1, limit = 20) {
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
    }

    const qb = this.repo.createQueryBuilder('pc').where('pc.deleted_at IS NULL');

    const [data, total] = await qb
      .orderBy('pc.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PosCashier> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Cashier not found', ar: 'أمين الصندوق غير موجود' });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<PosCashier | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findOne(opts: any): Promise<PosCashier | null> {
    const where = opts?.where ?? opts;
    return this.repo.findOne({ where: where as any });
  }

  async create(data: Partial<PosCashier>, ..._opts: any[]): Promise<PosCashier> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(id: string, data: Partial<PosCashier>, ..._opts: any[]): Promise<PosCashier> {
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
