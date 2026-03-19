import { Injectable, Logger } from '@nestjs/common';
import { ReportingRepository } from '@/database/sql/repositories/reporting.repository';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { PayrollStatus } from '@/common/enums/hr.enums';
import { PosSessionStatus } from '@/common/enums/pos.enums';

export interface DashboardResult {
  period: { from: string; to: string };
  revenue: { total: number; vsLastPeriod: number; byChannel: { pos: number; salesOrders: number } };
  expenses: { total: number; cogs: number; salaries: number; other: number };
  netIncome: number;
  inventory: { totalValue: number; lowStockCount: number; pendingReceiptsCount: number };
  sales: { ordersCount: number; avgOrderValue: number; pendingInvoiceCount: number };
  pos: { ordersToday: number; revenueToday: number; activeSessions: number };
  hr: { headcount: number; pendingPayrollRuns: number; expiringContractsCount: number };
  receivables: { total: number; overdueCount: number };
  payables: { total: number; overdueCount: number };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly reportingRepository: ReportingRepository,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  async getDashboard(tenantId: string, from?: string, to?: string): Promise<DashboardResult> {
    const now = new Date();
    const periodFrom =
      from ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const periodTo =
      to ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [revenue, expenses, inventory, sales, pos, hr, receivables, payables] = await Promise.all(
      [
        this.getRevenue(tenantId, periodFrom, periodTo),
        this.getExpenses(tenantId, periodFrom, periodTo),
        this.getInventory(tenantId),
        this.getSales(tenantId, periodFrom, periodTo),
        this.getPos(tenantId),
        this.getHr(tenantId),
        this.getReceivables(tenantId),
        this.getPayables(tenantId),
      ],
    );

    return {
      period: { from: periodFrom, to: periodTo },
      revenue,
      expenses,
      netIncome: revenue.total - expenses.total,
      inventory,
      sales,
      pos,
      hr,
      receivables,
      payables,
    };
  }

  private async getRevenue(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<DashboardResult['revenue']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // POS revenue
    const [posRows] = await sequelize.query(
      `SELECT COALESCE(SUM("totalAmount"), 0) as total
       FROM pos_orders
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status = 'completed'
         AND "createdAt" >= :from AND "createdAt" <= :to`,
      { replacements: { tenantId, from, to } },
    );

    // Sales orders revenue
    const [soRows] = await sequelize.query(
      `SELECT COALESCE(SUM("totalAmount"), 0) as total
       FROM sales_orders
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status IN ('invoiced', 'delivered')
         AND "createdAt" >= :from AND "createdAt" <= :to`,
      { replacements: { tenantId, from, to } },
    );

    // Previous period (same length, immediately before)
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodDays =
      Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevTo = new Date(fromDate);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - periodDays + 1);
    const prevFromStr = prevFrom.toISOString().split('T')[0];
    const prevToStr = prevTo.toISOString().split('T')[0];

    const [prevRows] = await sequelize.query(
      `SELECT
         COALESCE(SUM(CASE WHEN t.src = 'pos' THEN t.total ELSE 0 END), 0)
         + COALESCE(SUM(CASE WHEN t.src = 'so' THEN t.total ELSE 0 END), 0) as total
       FROM (
         SELECT 'pos' as src, COALESCE(SUM("totalAmount"), 0) as total
         FROM pos_orders
         WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL AND status = 'completed'
           AND "createdAt" >= :prevFrom AND "createdAt" <= :prevTo
         UNION ALL
         SELECT 'so' as src, COALESCE(SUM("totalAmount"), 0) as total
         FROM sales_orders
         WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL AND status IN ('invoiced', 'delivered')
           AND "createdAt" >= :prevFrom AND "createdAt" <= :prevTo
       ) t`,
      { replacements: { tenantId, prevFrom: prevFromStr, prevTo: prevToStr } },
    );

    const posTotal = parseFloat(String((posRows as any[])[0]?.total ?? '0'));
    const soTotal = parseFloat(String((soRows as any[])[0]?.total ?? '0'));
    const currentTotal = posTotal + soTotal;
    const prevTotal = parseFloat(String((prevRows as any[])[0]?.total ?? '0'));
    const vsLastPeriod = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

    return {
      total: currentTotal,
      vsLastPeriod: Math.round(vsLastPeriod * 10) / 10,
      byChannel: { pos: posTotal, salesOrders: soTotal },
    };
  }

  private async getExpenses(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<DashboardResult['expenses']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Expenses from journal entries (accounts starting with 5xxx = COGS, 6xxx = operating expenses)
    const [rows] = await sequelize.query(
      `SELECT
         COALESCE(SUM(CASE WHEN coa.code LIKE '5%' THEN jl.debit - jl.credit ELSE 0 END), 0) as cogs,
         COALESCE(SUM(CASE WHEN coa.code LIKE '6%' THEN jl.debit - jl.credit ELSE 0 END), 0) as other,
         COALESCE(SUM(jl.debit - jl.credit), 0) as total
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl."entryId"
       JOIN chart_of_accounts coa ON coa.id = jl."accountId"
       WHERE je."tenantId" = :tenantId AND je."isPosted" = true
         AND je."date" >= :from AND je."date" <= :to
         AND (coa.code LIKE '5%' OR coa.code LIKE '6%')`,
      { replacements: { tenantId, from, to } },
    );

    // Salaries from payroll runs
    const [salaryRows] = await sequelize.query(
      `SELECT COALESCE(SUM(pi."netPay"), 0) as salaries
       FROM payroll_items pi
       JOIN payroll_runs pr ON pr.id = pi."runId"
       WHERE pr."tenantId" = :tenantId AND pr."deletedAt" IS NULL
         AND pr.status = '${PayrollStatus.PAID}'
         AND pr."periodEnd" >= :from AND pr."periodEnd" <= :to`,
      { replacements: { tenantId, from, to } },
    );

    const row = (rows as any[])[0] ?? { total: '0', cogs: '0', other: '0' };
    const salaries = parseFloat(String((salaryRows as any[])[0]?.salaries ?? '0'));

    return {
      total: parseFloat(String(row.total ?? '0')) + salaries,
      cogs: parseFloat(String(row.cogs ?? '0')),
      salaries,
      other: parseFloat(String(row.other ?? '0')),
    };
  }

  private async getInventory(tenantId: string): Promise<DashboardResult['inventory']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
         COALESCE(SUM(sl.quantity * COALESCE(p."costPrice", 0)), 0) as "totalValue",
         COUNT(CASE WHEN sl.quantity <= p."reorderPoint" AND sl.quantity > 0 THEN 1 END) as "lowStockCount"
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId"
       WHERE sl."tenantId" = :tenantId AND p."deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    const [receiptRows] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM purchase_orders
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status NOT IN ('delivered', 'cancelled')`,
      { replacements: { tenantId } },
    );

    const row = (rows as any[])[0] ?? { totalValue: '0', lowStockCount: '0' };
    return {
      totalValue: parseFloat(String(row.totalValue ?? '0')),
      lowStockCount: parseInt(String(row.lowStockCount ?? '0'), 10),
      pendingReceiptsCount: parseInt(String((receiptRows as any[])[0]?.count ?? '0'), 10),
    };
  }

  private async getSales(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<DashboardResult['sales']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
         COUNT(*) as "ordersCount",
         COALESCE(AVG("totalAmount"), 0) as "avgOrderValue",
         COUNT(CASE WHEN status = 'delivered' THEN 1 END) as "pendingInvoiceCount"
       FROM sales_orders
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND "createdAt" >= :from AND "createdAt" <= :to`,
      { replacements: { tenantId, from, to } },
    );

    const row = (rows as any[])[0] ?? {
      ordersCount: '0',
      avgOrderValue: '0',
      pendingInvoiceCount: '0',
    };
    return {
      ordersCount: parseInt(String(row.ordersCount ?? '0'), 10),
      avgOrderValue: parseFloat(String(row.avgOrderValue ?? '0')),
      pendingInvoiceCount: parseInt(String(row.pendingInvoiceCount ?? '0'), 10),
    };
  }

  private async getPos(tenantId: string): Promise<DashboardResult['pos']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const today = new Date().toISOString().split('T')[0];

    const [orderRows] = await sequelize.query(
      `SELECT
         COUNT(*) as "ordersToday",
         COALESCE(SUM("totalAmount"), 0) as "revenueToday"
       FROM pos_orders
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status = 'completed'
         AND DATE("createdAt") = :today`,
      { replacements: { tenantId, today } },
    );

    const [sessionRows] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM pos_sessions
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status = '${PosSessionStatus.OPEN}'`,
      { replacements: { tenantId } },
    );

    const oRow = (orderRows as any[])[0] ?? { ordersToday: '0', revenueToday: '0' };
    return {
      ordersToday: parseInt(String(oRow.ordersToday ?? '0'), 10),
      revenueToday: parseFloat(String(oRow.revenueToday ?? '0')),
      activeSessions: parseInt(String((sessionRows as any[])[0]?.count ?? '0'), 10),
    };
  }

  private async getHr(tenantId: string): Promise<DashboardResult['hr']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [empRows] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM employees
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    const [payrollRows] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM payroll_runs
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status IN ('${PayrollStatus.DRAFT}', '${PayrollStatus.CONFIRMED}')`,
      { replacements: { tenantId } },
    );

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiryDate = thirtyDaysFromNow.toISOString().split('T')[0];

    const [contractRows] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM employee_contracts
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND "endDate" IS NOT NULL AND "endDate" <= :expiryDate
         AND "endDate" >= CURRENT_DATE`,
      { replacements: { tenantId, expiryDate } },
    );

    return {
      headcount: parseInt(String((empRows as any[])[0]?.count ?? '0'), 10),
      pendingPayrollRuns: parseInt(String((payrollRows as any[])[0]?.count ?? '0'), 10),
      expiringContractsCount: parseInt(String((contractRows as any[])[0]?.count ?? '0'), 10),
    };
  }

  private async getReceivables(tenantId: string): Promise<DashboardResult['receivables']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Receivables from sales orders that are invoiced but not yet paid
    const [rows] = await sequelize.query(
      `SELECT
         COALESCE(SUM("totalAmount"), 0) as total,
         COUNT(CASE WHEN "createdAt" < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as "overdueCount"
       FROM sales_orders
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status = 'invoiced'`,
      { replacements: { tenantId } },
    );

    const row = (rows as any[])[0] ?? { total: '0', overdueCount: '0' };
    return {
      total: parseFloat(String(row.total ?? '0')),
      overdueCount: parseInt(String(row.overdueCount ?? '0'), 10),
    };
  }

  private async getPayables(tenantId: string): Promise<DashboardResult['payables']> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Payables from purchase orders that are received but not yet paid
    const [rows] = await sequelize.query(
      `SELECT
         COALESCE(SUM("totalAmount"), 0) as total,
         COUNT(CASE WHEN "createdAt" < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as "overdueCount"
       FROM purchase_orders
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
         AND status IN ('confirmed', 'received')`,
      { replacements: { tenantId } },
    );

    const row = (rows as any[])[0] ?? { total: '0', overdueCount: '0' };
    return {
      total: parseFloat(String(row.total ?? '0')),
      overdueCount: parseInt(String(row.overdueCount ?? '0'), 10),
    };
  }
}
