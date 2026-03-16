import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket } from '@/database/sql/entities/ticket.entity';
import { TicketStatus } from '@/common/enums/ticket.enums';

@Injectable()
export class TicketsRepository {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(opts: {
    page?: number;
    limit?: number;
    search?: string;
    searchFields?: string[];
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    where?: Record<string, unknown>;
    tenantId?: string;
    bypassTenantScope?: boolean;
  }): Promise<{
    data: Ticket[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const order = opts.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.repo.createQueryBuilder('t').where('t.deleted_at IS NULL');

    if (!opts.bypassTenantScope && opts.tenantId) {
      qb.andWhere('t.tenant_id = :tenantId', { tenantId: opts.tenantId });
    }
    if (opts.where?.status) {
      qb.andWhere('t.status = :status', { status: opts.where.status });
    }
    if (opts.where?.priority) {
      qb.andWhere('t.priority = :priority', { priority: opts.where.priority });
    }
    if (opts.where?.assignedTo) {
      qb.andWhere('t.assigned_to = :assignedTo', { assignedTo: opts.where.assignedTo });
    }
    if (opts.where?.tenantId) {
      qb.andWhere('t.tenant_id = :filterTenantId', { filterTenantId: opts.where.tenantId });
    }
    if (opts.search) {
      qb.andWhere('t.subject ILIKE :q', { q: `%${opts.search}%` });
    }

    const [data, total] = await qb
      .orderBy('t.created_at', order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findByIdOrNull(
    id: string,
    opts?: {
      include?: any[];
      tenantId?: string;
      bypassTenantScope?: boolean;
    },
  ): Promise<Ticket | null> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.id = :id', { id })
      .andWhere('t.deleted_at IS NULL');

    if (!opts?.bypassTenantScope && opts?.tenantId) {
      qb.andWhere('t.tenant_id = :tenantId', { tenantId: opts.tenantId });
    }

    if (opts?.include?.length) {
      qb.leftJoinAndSelect('t.replies', 'replies');
    }

    return qb.getOne();
  }

  async create(
    data: Partial<Ticket>,
    opts?: { tenantId?: string; bypassTenantScope?: boolean },
  ): Promise<Ticket> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<Ticket>,
    opts?: {
      tenantId?: string;
      bypassTenantScope?: boolean;
      transaction?: any;
    },
  ): Promise<Ticket> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.id = :id', { id })
      .andWhere('t.deleted_at IS NULL');

    if (!opts?.bypassTenantScope && opts?.tenantId) {
      qb.andWhere('t.tenant_id = :tenantId', { tenantId: opts.tenantId });
    }

    const entity = await qb.getOne();
    if (!entity) throw new NotFoundException({ en: 'Ticket not found', ar: 'التذكرة غير موجودة' });

    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(
    id: string,
    opts?: { tenantId?: string; bypassTenantScope?: boolean },
  ): Promise<void> {
    const entity = await this.findByIdOrNull(id, opts);
    if (!entity) return;
    await this.repo.softRemove(entity);
  }

  async count(opts?: {
    where?: Record<string, unknown>;
    tenantId?: string;
    bypassTenantScope?: boolean;
  }): Promise<number> {
    const qb = this.repo.createQueryBuilder('t').where('t.deleted_at IS NULL');

    if (!opts?.bypassTenantScope && opts?.tenantId) {
      qb.andWhere('t.tenant_id = :tenantId', { tenantId: opts.tenantId });
    }
    if (opts?.where?.status) {
      qb.andWhere('t.status = :status', { status: opts.where.status });
    }
    if (opts?.where?.priority) {
      qb.andWhere('t.priority = :priority', { priority: opts.where.priority });
    }
    if (opts?.where?.createdAt) {
      const filter = opts.where.createdAt as any;
      if (filter.lt) qb.andWhere('t.created_at < :lt', { lt: filter.lt });
      if (filter.gt) qb.andWhere('t.created_at > :gt', { gt: filter.gt });
    }

    return qb.getCount();
  }

  async rawQuery(sql: string, params: Record<string, unknown>): Promise<any[]> {
    return this.dataSource.query(sql, Object.values(params));
  }

  getSequelize(): never {
    throw new Error('getSequelize is not available in TypeORM mode');
  }
}
