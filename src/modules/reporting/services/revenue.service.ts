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
       WHERE "deletedAt" IS NULL`,
      { type: 'SELECT' } as any,
    );

    const [subStats] = await this.sequelize.query(
      `SELECT
         COUNT(*) FILTER (WHERE s.status = 'active') as "activeSubs",
         COALESCE(SUM(CASE WHEN s.status = 'active' THEN p."monthlyPrice" ELSE 0 END), 0) as mrr,
         COALESCE(SUM(CASE WHEN s.status = 'active' THEN p."monthlyPrice" * 12 ELSE 0 END), 0) as "totalRevenue"
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s."planId"`,
      { type: 'SELECT' } as any,
    );

    const [churnedData] = await this.sequelize.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('cancelled', 'expired')
           AND "updatedAt" >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month') as churned,
         COUNT(*) as total
       FROM subscriptions`,
      { type: 'SELECT' } as any,
    );

    const tRow = (tenantStats as any) ?? { total: '0', active: '0', trial: '0', suspended: '0' };
    const sRow = (subStats as any) ?? { activeSubs: '0', mrr: '0', totalRevenue: '0' };
    const cRow = (churnedData as any) ?? { churned: '0', total: '0' };

    const totalSubs = parseInt(cRow.total || '0', 10);
    const churnedCount = parseInt(cRow.churned || '0', 10);

    return {
      totalTenants: parseInt(tRow.total || '0', 10),
      activeTenants: parseInt(tRow.active || '0', 10),
      trialTenants: parseInt(tRow.trial || '0', 10),
      suspendedTenants: parseInt(tRow.suspended || '0', 10),
      totalRevenue: parseFloat(sRow.totalRevenue || '0'),
      monthlyRevenue: parseFloat(sRow.mrr || '0'),
      activeSubscriptions: parseInt(sRow.activeSubs || '0', 10),
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
              COALESCE(SUM(p."monthlyPrice"), 0) as mrr
       FROM subscriptions s
       JOIN plans p ON p.id = s."planId"
       WHERE s.status = 'active'`,
      { type: 'SELECT' } as any,
    );

    const [totalSubs] = await this.sequelize.query(`SELECT COUNT(*) as count FROM subscriptions`, {
      type: 'SELECT',
    } as any);

    // Previous month MRR for growth calculation
    const [prevMonth] = await this.sequelize.query(
      `SELECT COALESCE(SUM(p."monthlyPrice"), 0) as "prevMrr"
       FROM subscriptions s
       JOIN plans p ON p.id = s."planId"
       WHERE s.status = 'active'
         AND s."createdAt" < DATE_TRUNC('month', NOW())`,
      { type: 'SELECT' } as any,
    );

    // Churned last month
    const [churned] = await this.sequelize.query(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE status IN ('cancelled', 'expired')
         AND "updatedAt" >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
         AND "updatedAt" < DATE_TRUNC('month', NOW())`,
      { type: 'SELECT' } as any,
    );

    const activeRow = (activeSubs as unknown as Record<string, string>[])[0] ?? {
      count: '0',
      mrr: '0',
    };
    const totalRow = (totalSubs as unknown as Record<string, string>[])[0] ?? { count: '0' };
    const prevRow = (prevMonth as unknown as Record<string, string>[])[0] ?? { prevMrr: '0' };
    const churnedRow = (churned as unknown as Record<string, string>[])[0] ?? { count: '0' };

    const mrr = parseFloat(activeRow.mrr || '0');
    const prevMrr = parseFloat(prevRow.prevMrr || '0');
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
         COALESCE(SUM(CASE WHEN s.status = 'active' AND s."createdAt" <= m.month + INTERVAL '1 month' THEN p."monthlyPrice" ELSE 0 END), 0) as revenue,
         COALESCE(SUM(CASE WHEN s."createdAt" >= m.month AND s."createdAt" < m.month + INTERVAL '1 month' THEN p."monthlyPrice" ELSE 0 END), 0) as "newMrr",
         COALESCE(SUM(CASE WHEN s.status IN ('cancelled','expired') AND s."updatedAt" >= m.month AND s."updatedAt" < m.month + INTERVAL '1 month' THEN p."monthlyPrice" ELSE 0 END), 0) as "churnedMrr"
       FROM months m
       LEFT JOIN subscriptions s ON s."createdAt" <= m.month + INTERVAL '1 month'
       LEFT JOIN plans p ON p.id = s."planId"
       GROUP BY m.month
       ORDER BY m.month ASC`,
      { type: 'SELECT' } as any,
    );

    return ((rows as unknown as Record<string, string>[]) ?? []).map((row) => ({
      month: row.month ?? '',
      revenue: parseFloat(row.revenue || '0'),
      newMrr: parseFloat(row.newMrr || '0'),
      churnedMrr: parseFloat(row.churnedMrr || '0'),
    }));
  }

  async getRevenueByPlan(): Promise<Array<{ name: string; value: number; count: number }>> {
    const rows = await this.sequelize.query(
      `SELECT p."nameEn" as name, COUNT(s.id) as count,
              COALESCE(SUM(p."monthlyPrice"), 0) as value
       FROM subscriptions s
       JOIN plans p ON p.id = s."planId"
       WHERE s.status = 'active'
       GROUP BY p."nameEn"
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
      `SELECT t."nameEn" as name, p.slug as plan,
              p."monthlyPrice" as mrr,
              p."monthlyPrice" * 12 as arr,
              s.status
       FROM subscriptions s
       JOIN plans p ON p.id = s."planId"
       JOIN tenants t ON t.id = s."tenantId"
       WHERE s.status = 'active'
       ORDER BY p."monthlyPrice" DESC
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
