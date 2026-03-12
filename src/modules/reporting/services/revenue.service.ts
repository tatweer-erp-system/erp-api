import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async getDashboardStats(): Promise<{
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
    churnRate: number;
  }> {
    const [tenantStats] = await this.sequelize.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'trial') as trial,
         COUNT(*) FILTER (WHERE status = 'suspended') as suspended
       FROM tenants
       WHERE deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );

    const [subStats] = await this.sequelize.query(
      `SELECT
         COUNT(*) FILTER (WHERE s.status = 'active') as active_subs,
         COALESCE(SUM(CASE WHEN s.status = 'active' THEN p.monthly_price ELSE 0 END), 0) as mrr,
         COALESCE(SUM(CASE WHEN s.status = 'active' THEN p.monthly_price * 12 ELSE 0 END), 0) as total_revenue
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id`,
      { type: 'SELECT' } as any,
    );

    const [churnedData] = await this.sequelize.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('cancelled', 'expired')
           AND updated_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month') as churned,
         COUNT(*) as total
       FROM subscriptions`,
      { type: 'SELECT' } as any,
    );

    const tRow = (tenantStats as any) ?? { total: '0', active: '0', trial: '0', suspended: '0' };
    const sRow = (subStats as any) ?? { active_subs: '0', mrr: '0', total_revenue: '0' };
    const cRow = (churnedData as any) ?? { churned: '0', total: '0' };

    const totalSubs = parseInt(cRow.total || '0', 10);
    const churnedCount = parseInt(cRow.churned || '0', 10);

    return {
      totalTenants: parseInt(tRow.total || '0', 10),
      activeTenants: parseInt(tRow.active || '0', 10),
      trialTenants: parseInt(tRow.trial || '0', 10),
      suspendedTenants: parseInt(tRow.suspended || '0', 10),
      totalRevenue: parseFloat(sRow.total_revenue || '0'),
      monthlyRevenue: parseFloat(sRow.mrr || '0'),
      activeSubscriptions: parseInt(sRow.active_subs || '0', 10),
      churnRate: totalSubs > 0 ? Math.round((churnedCount / totalSubs) * 1000) / 10 : 0,
    };
  }

  async getSummary(): Promise<{
    mrr: number;
    arr: number;
    mrrGrowth: number;
    churnRate: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
  }> {
    // Active subscriptions with plan pricing
    const [activeSubs] = await this.sequelize.query(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(p.monthly_price), 0) as mrr
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.status = 'active'`,
      { type: 'SELECT' } as any,
    );

    const [totalSubs] = await this.sequelize.query(`SELECT COUNT(*) as count FROM subscriptions`, {
      type: 'SELECT',
    } as any);

    // Previous month MRR for growth calculation
    const [prevMonth] = await this.sequelize.query(
      `SELECT COALESCE(SUM(p.monthly_price), 0) as prev_mrr
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.status = 'active'
         AND s.created_at < DATE_TRUNC('month', NOW())`,
      { type: 'SELECT' } as any,
    );

    // Churned last month
    const [churned] = await this.sequelize.query(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE status IN ('cancelled', 'expired')
         AND updated_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
         AND updated_at < DATE_TRUNC('month', NOW())`,
      { type: 'SELECT' } as any,
    );

    const activeRow = (activeSubs as unknown as Record<string, string>[])[0] ?? {
      count: '0',
      mrr: '0',
    };
    const totalRow = (totalSubs as unknown as Record<string, string>[])[0] ?? { count: '0' };
    const prevRow = (prevMonth as unknown as Record<string, string>[])[0] ?? { prev_mrr: '0' };
    const churnedRow = (churned as unknown as Record<string, string>[])[0] ?? { count: '0' };

    const mrr = parseFloat(activeRow.mrr || '0');
    const prevMrr = parseFloat(prevRow.prev_mrr || '0');
    const totalActive = parseInt(activeRow.count || '0', 10);
    const totalCount = parseInt(totalRow.count || '0', 10);
    const churnedCount = parseInt(churnedRow.count || '0', 10);

    const mrrGrowth = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;
    const churnRate = totalCount > 0 ? (churnedCount / totalCount) * 100 : 0;

    return {
      mrr,
      arr: mrr * 12,
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      churnRate: Math.round(churnRate * 10) / 10,
      totalSubscriptions: totalCount,
      activeSubscriptions: totalActive,
    };
  }

  async getMonthlyRevenue(months = 12): Promise<
    Array<{
      month: string;
      revenue: number;
      newMrr: number;
      churnedMrr: number;
    }>
  > {
    const safeMonths = Math.max(1, Math.min(Math.floor(months), 120));
    const rows = await this.sequelize.query(
      `WITH months AS (
         SELECT generate_series(
           DATE_TRUNC('month', NOW()) - make_interval(months => ${safeMonths - 1}),
           DATE_TRUNC('month', NOW()),
           '1 month'::interval
         ) as month
       )
       SELECT
         TO_CHAR(m.month, 'Mon ''YY') as month,
         COALESCE(SUM(CASE WHEN s.status = 'active' AND s.created_at <= m.month + INTERVAL '1 month' THEN p.monthly_price ELSE 0 END), 0) as revenue,
         COALESCE(SUM(CASE WHEN s.created_at >= m.month AND s.created_at < m.month + INTERVAL '1 month' THEN p.monthly_price ELSE 0 END), 0) as new_mrr,
         COALESCE(SUM(CASE WHEN s.status IN ('cancelled','expired') AND s.updated_at >= m.month AND s.updated_at < m.month + INTERVAL '1 month' THEN p.monthly_price ELSE 0 END), 0) as churned_mrr
       FROM months m
       LEFT JOIN subscriptions s ON s.created_at <= m.month + INTERVAL '1 month'
       LEFT JOIN plans p ON p.id = s.plan_id
       GROUP BY m.month
       ORDER BY m.month ASC`,
      { type: 'SELECT' } as any,
    );

    return ((rows as unknown as Record<string, string>[]) ?? []).map((row) => ({
      month: row.month ?? '',
      revenue: parseFloat(row.revenue || '0'),
      newMrr: parseFloat(row.new_mrr || '0'),
      churnedMrr: parseFloat(row.churned_mrr || '0'),
    }));
  }

  async getRevenueByPlan(): Promise<Array<{ name: string; value: number; count: number }>> {
    const rows = await this.sequelize.query(
      `SELECT p.name->>'en' as name, COUNT(s.id) as count,
              COALESCE(SUM(p.monthly_price), 0) as value
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.status = 'active'
       GROUP BY p.name->>'en'
       ORDER BY value DESC`,
      { type: 'SELECT' } as any,
    );

    return ((rows as unknown as Record<string, string>[]) ?? []).map((row) => ({
      name: row.name ?? '',
      value: parseFloat(row.value || '0'),
      count: parseInt(row.count || '0', 10),
    }));
  }

  async getTopTenants(limit = 10): Promise<
    Array<{
      rank: number;
      name: string;
      plan: string;
      mrr: number;
      arr: number;
      status: string;
    }>
  > {
    const rows = await this.sequelize.query(
      `SELECT t.name as name, p.slug as plan,
              p.monthly_price as mrr,
              p.monthly_price * 12 as arr,
              s.status
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       JOIN tenants t ON t.id = s.tenant_id
       WHERE s.status = 'active'
       ORDER BY p.monthly_price DESC
       LIMIT :limit`,
      { replacements: { limit }, type: 'SELECT' } as any,
    );

    return ((rows as unknown as Record<string, string>[]) ?? []).map((row, i) => ({
      rank: i + 1,
      name: row.name ?? '',
      plan: row.plan ?? '',
      mrr: parseFloat(row.mrr || '0'),
      arr: parseFloat(row.arr || '0'),
      status: row.status ?? '',
    }));
  }
}
