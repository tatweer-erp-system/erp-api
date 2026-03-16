import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManagerOverride } from '@/database/sql/entities/manager-override.entity';

@Injectable()
export class ManagerOverridesRepository {
  constructor(
    @InjectRepository(ManagerOverride)
    private readonly repo: Repository<ManagerOverride>,
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

    const qb = this.repo.createQueryBuilder('mo').where('mo.deleted_at IS NULL');
    if (branchId) qb.andWhere('mo.branch_id = :branchId', { branchId });

    const [data, total] = await qb
      .orderBy('mo.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<ManagerOverride> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Override not found', ar: 'التجاوز غير موجود' });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<ManagerOverride | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  /**
   * Find a valid (unused, not expired) override for a given session and action.
   * Expiry is when the session ends — checked externally by service layer.
   */
  async findValid(sessionId: string, action: string): Promise<ManagerOverride | null> {
    return this.repo
      .createQueryBuilder('mo')
      .where('mo.session_id = :sessionId', { sessionId })
      .andWhere('(mo.action = :action OR mo.action_type = :action)', { action })
      .andWhere('mo.is_used = false')
      .andWhere('mo.deleted_at IS NULL')
      .getOne();
  }

  async create(data: Partial<ManagerOverride>, ..._opts: any[]): Promise<ManagerOverride> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    data: Partial<ManagerOverride>,
    ..._opts: any[]
  ): Promise<ManagerOverride> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async markUsed(id: string): Promise<ManagerOverride> {
    const entity = await this.findById(id);
    entity.isUsed = true;
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
