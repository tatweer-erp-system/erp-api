import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '@/database/sql/entities/subscription.entity';
import { Plan } from '@/database/sql/entities/plan.entity';
import { SubscriptionStatus } from '@/common/enums/subscription.enums';

@Injectable()
export class SubscriptionsRepository {
  constructor(@InjectRepository(Subscription) private readonly repo: Repository<Subscription>) {}

  async findAll(
    filters: { tenantId?: string; status?: string; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .where('s.deleted_at IS NULL');

    if (filters.tenantId) qb.andWhere('s.tenant_id = :tenantId', { tenantId: filters.tenantId });
    if (filters.status) qb.andWhere('s.status = :status', { status: filters.status });

    const pageNum = filters.page ?? page;
    const limitNum = filters.limit ?? limit;

    const [data, total] = await qb
      .orderBy('s.created_at', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return {
      data,
      rows: data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findAllWithPlan(opts: {
    where?: Record<string, unknown>;
    planSlug?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Subscription[]; count: number }> {
    const qb = this.repo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .where('s.deleted_at IS NULL');

    if (opts.where?.status) {
      qb.andWhere('s.status = :status', { status: opts.where.status });
    }
    if (opts.where?.tenantId) {
      qb.andWhere('s.tenant_id = :tenantId', { tenantId: opts.where.tenantId });
    }
    if (opts.planSlug) {
      qb.andWhere('plan.slug = :planSlug', { planSlug: opts.planSlug });
    }
    if (opts.where?.currentPeriodEnd) {
      const f = opts.where.currentPeriodEnd as any;
      if (f.lte) qb.andWhere('s.current_period_end <= :lte', { lte: f.lte });
      if (f.gte) qb.andWhere('s.current_period_end >= :gte', { gte: f.gte });
    }

    const safeSort = ['created_at', 'status', 'current_period_end'].includes(opts.sortBy ?? '')
      ? opts.sortBy!
      : 'created_at';

    const [rows, count] = await qb
      .orderBy(`s.${safeSort}`, opts.sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .skip(opts.offset ?? 0)
      .take(opts.limit ?? 20)
      .getManyAndCount();

    return { rows, count };
  }

  async findById(id: string, ..._opts: any[]): Promise<Subscription> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['plan'],
    });
    if (!entity) {
      throw new NotFoundException({ en: 'Subscription not found', ar: 'الاشتراك غير موجود' });
    }
    return entity;
  }

  async findByIdOrNull(id: string): Promise<Subscription | null> {
    return this.repo.findOne({ where: { id }, relations: ['plan'] });
  }

  async findByTenant(tenantId: string, _includes?: any[]): Promise<Subscription | null> {
    return this.repo.findOne({
      where: { tenantId, deletedAt: null as any },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(tenantId: string): Promise<Subscription | null> {
    return this.repo.findOne({
      where: { tenantId, status: SubscriptionStatus.ACTIVE, deletedAt: null as any },
      relations: ['plan'],
    });
  }

  async findActiveWithPlan(): Promise<Subscription[]> {
    return this.repo.find({
      where: [
        { status: SubscriptionStatus.ACTIVE, deletedAt: null as any },
        { status: SubscriptionStatus.TRIAL, deletedAt: null as any },
      ],
      relations: ['plan'],
    });
  }

  async create(data: Partial<Subscription>, ..._opts: any[]): Promise<Subscription> {
    const entity = this.repo.create(data as Subscription);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    versionOrData: number | Partial<Subscription>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<Subscription> {
    const entity = await this.findById(id);
    const data: Partial<Subscription> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async count(opts: { where?: Record<string, unknown> } = {}): Promise<number> {
    const qb = this.repo.createQueryBuilder('s').where('s.deleted_at IS NULL');
    if (opts.where?.status) {
      qb.andWhere('s.status = :status', { status: opts.where.status });
    }
    return qb.getCount();
  }

  async groupByStatus(_where?: Record<string, unknown>): Promise<Record<string, number>> {
    const rows = await this.repo
      .createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('s.deleted_at IS NULL')
      .groupBy('s.status')
      .getRawMany();

    return rows.reduce(
      (acc, row) => {
        acc[row.status] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async groupByPlan(_where?: Record<string, unknown>): Promise<Record<string, number>> {
    const rows = await this.repo
      .createQueryBuilder('s')
      .leftJoin('s.plan', 'plan')
      .select('plan.slug', 'slug')
      .addSelect('COUNT(*)', 'count')
      .where('s.deleted_at IS NULL')
      .groupBy('plan.slug')
      .getRawMany();

    return rows.reduce(
      (acc, row) => {
        acc[row.slug ?? 'unknown'] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async groupByCycle(_where?: Record<string, unknown>): Promise<Record<string, number>> {
    const rows = await this.repo
      .createQueryBuilder('s')
      .select('s.billing_cycle', 'billingCycle')
      .addSelect('COUNT(*)', 'count')
      .where('s.deleted_at IS NULL')
      .groupBy('s.billing_cycle')
      .getRawMany();

    return rows.reduce(
      (acc, row) => {
        acc[row.billingCycle] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async getMonthlyTrend(months: number): Promise<{ month: string; count: number }[]> {
    return this.repo
      .createQueryBuilder('s')
      .select("TO_CHAR(s.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('s.deleted_at IS NULL')
      .andWhere("s.created_at >= NOW() - INTERVAL ':months months'", { months })
      .groupBy("TO_CHAR(s.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();
  }
}
