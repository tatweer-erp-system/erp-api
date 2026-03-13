import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';

interface DateFilter {
  clause: string;
  replacements: Record<string, string>;
}

@Injectable()
export class ReportingRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async getSalesByStatus(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT po.status, COUNT(*) as "orderCount", COALESCE(SUM(po."totalAmount"), 0) as "totalAmount"
       FROM purchase_orders po
       WHERE po."deletedAt" IS NULL AND po."tenantId" = :tenantId ${dateFilter.clause}
       GROUP BY po.status
       ORDER BY "totalAmount" DESC`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getSalesSummary(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        COUNT(*) as "totalOrders",
        COALESCE(SUM("totalAmount"), 0) as "totalRevenue",
        COALESCE(AVG("totalAmount"), 0) as "avgOrderValue"
       FROM purchase_orders
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${dateFilter.clause}`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getLowStockItems(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT p.name, sl.quantity, p."reorderPoint", w.name as warehouse
       FROM stock_levels sl
       JOIN products p ON p.id = sl."productId"
       JOIN warehouses w ON w.id = sl."warehouseId"
       WHERE sl.quantity <= p."reorderPoint" AND p."deletedAt" IS NULL AND sl."tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getStockSummary(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        COUNT(DISTINCT sl."productId") as "totalProductsInStock",
        COUNT(DISTINCT sl."warehouseId") as "totalWarehouses",
        COALESCE(SUM(sl.quantity), 0) as "totalQuantity"
       FROM stock_levels sl
       WHERE sl."tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getEmployeesByDepartment(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT d.name, COUNT(e.id) as "employeeCount"
       FROM departments d LEFT JOIN employees e ON e."departmentId" = d.id AND e."deletedAt" IS NULL
       WHERE d."deletedAt" IS NULL AND d."tenantId" = :tenantId GROUP BY d.id, d.name ORDER BY "employeeCount" DESC`,
      { replacements: { tenantId } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getLeaveStats(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT l.status, COUNT(*) as count
       FROM leaves l
       WHERE l."deletedAt" IS NULL AND l."tenantId" = :tenantId ${dateFilter.clause}
       GROUP BY l.status`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getEmployeeSummary(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as "totalEmployees"
       FROM employees WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getFinancialRevenue(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        COALESCE(SUM(CASE WHEN status IN ('paid', 'delivered') THEN "totalAmount" ELSE 0 END), 0) as "totalRevenue",
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN "totalAmount" ELSE 0 END), 0) as "cancelledAmount",
        COUNT(*) as "totalTransactions"
       FROM purchase_orders
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${dateFilter.clause}`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getMonthlyTrend(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as "orderCount",
        COALESCE(SUM("totalAmount"), 0) as amount
       FROM purchase_orders
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${dateFilter.clause}
       GROUP BY DATE_TRUNC('month', "createdAt")
       ORDER BY month DESC
       LIMIT 12`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getCrmPipeline(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT l.status, COUNT(*) as count, COALESCE(SUM(l."estimatedValue"), 0) as "totalValue"
       FROM leads l
       WHERE l."deletedAt" IS NULL AND l."tenantId" = :tenantId ${dateFilter.clause}
       GROUP BY l.status
       ORDER BY count DESC`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getCrmSummary(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        COUNT(*) as "totalLeads",
        COUNT(CASE WHEN status = 'won' THEN 1 END) as "wonLeads",
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as "lostLeads",
        COALESCE(SUM(CASE WHEN status = 'won' THEN "estimatedValue" ELSE 0 END), 0) as "wonValue"
       FROM leads
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${dateFilter.clause}`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getDashboardEmployeeCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM employees WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardProductCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM products WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardOpenLeadsCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM leads WHERE status NOT IN ('won','lost') AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardOpenPOsCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE status NOT IN ('delivered','cancelled') AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardActiveProjectsCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM projects WHERE status = 'active' AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardPendingTasksCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done','cancelled') AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }
}
