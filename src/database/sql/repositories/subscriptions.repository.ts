import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { Subscription } from '../entities/subscription.entity';
import { Plan } from '../entities/plan.entity';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class SubscriptionsRepository extends BaseRepository<Subscription> {
  constructor() {
    super(Subscription, false);
  }

  async findByTenant(tenantId: string, include?: any[]): Promise<Subscription | null> {
    return this.findOne({ where: { tenantId }, include });
  }

  async findAllWithPlan(options: {
    where: Record<string, unknown>;
    planSlug?: string;
    sortBy: string;
    sortOrder: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Subscription[]; count: number }> {
    const planInclude = options.planSlug
      ? { model: Plan, where: { slug: options.planSlug } }
      : { model: Plan };
    const includeOptions: any[] = [
      planInclude,
      { model: Tenant, attributes: ['id', 'name', 'slug'] },
    ];
    const { rows, count } = await this.model.findAndCountAll({
      where: options.where as any,
      include: includeOptions,
      order: [[options.sortBy, options.sortOrder]],
      limit: options.limit,
      offset: options.offset,
      distinct: true,
    });
    return {
      rows: rows.map((r) => r.get({ plain: true })) as Subscription[],
      count: typeof count === 'number' ? count : (count as unknown[]).length,
    };
  }

  async countWithWhere(where: Record<string, unknown>): Promise<number> {
    return this.count({ where });
  }

  async groupByStatus(where: Record<string, unknown>): Promise<any[]> {
    return this.model.findAll({
      where: where as any,
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
  }

  async groupByPlan(where: Record<string, unknown>): Promise<any[]> {
    return this.model.findAll({
      where: where as any,
      include: [{ model: Plan, attributes: ['slug', 'name'] }],
      attributes: ['planId', [Sequelize.fn('COUNT', Sequelize.col('Subscription.id')), 'count']],
      group: ['planId', 'plan.id', 'plan.slug', 'plan.name'],
      raw: true,
      nest: true,
    });
  }

  async findActiveWithPlan(): Promise<Subscription[]> {
    return this.findAllRaw({ where: { status: 'active' }, include: [{ model: Plan }] });
  }

  /**
   * Monthly subscription trend for the last N months.
   * Returns new subscription count and MRR per month.
   */
  async getMonthlyTrend(
    months = 12,
  ): Promise<{ period: string; count: number; revenue: number }[]> {
    const safeMonths = Math.min(Math.max(months, 1), 36);
    const [rows] = await this.model.sequelize!.query(
      `WITH months AS (
         SELECT generate_series(
           DATE_TRUNC('month', NOW()) - make_interval(months => :months),
           DATE_TRUNC('month', NOW()),
           '1 month'::interval
         ) AS month
       )
       SELECT
         TO_CHAR(m.month, 'Mon ''YY') AS period,
         COUNT(s.id)::int AS count,
         COALESCE(SUM(p.monthly_price), 0)::int AS revenue
       FROM months m
       LEFT JOIN public.subscriptions s
         ON DATE_TRUNC('month', s.created_at) = m.month
       LEFT JOIN public.plans p
         ON p.id = s.plan_id
       GROUP BY m.month
       ORDER BY m.month ASC`,
      { replacements: { months: safeMonths - 1 } },
    );
    return rows as { period: string; count: number; revenue: number }[];
  }

  /**
   * Group subscriptions by billing cycle.
   */
  async groupByCycle(where: Record<string, unknown>): Promise<any[]> {
    return this.model.findAll({
      where: where as any,
      attributes: [
        ['billing_cycle', 'cycle'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: ['billing_cycle'],
      raw: true,
    });
  }
}
