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
      `SELECT po.status, COUNT(*) as order_count, COALESCE(SUM(po.total_amount), 0) as total_amount
       FROM purchase_orders po
       WHERE po.deleted_at IS NULL AND po.tenant_id = :tenantId ${dateFilter.clause}
       GROUP BY po.status
       ORDER BY total_amount DESC`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getSalesSummary(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_order_value
       FROM purchase_orders
       WHERE deleted_at IS NULL AND tenant_id = :tenantId ${dateFilter.clause}`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getLowStockItems(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT p.name, sl.quantity, p.reorder_point, w.name as warehouse
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id
       JOIN warehouses w ON w.id = sl.warehouse_id
       WHERE sl.quantity <= p.reorder_point AND p.deleted_at IS NULL AND sl.tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getStockSummary(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        COUNT(DISTINCT sl.product_id) as total_products_in_stock,
        COUNT(DISTINCT sl.warehouse_id) as total_warehouses,
        COALESCE(SUM(sl.quantity), 0) as total_quantity
       FROM stock_levels sl
       WHERE sl.tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getEmployeesByDepartment(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT d.name, COUNT(e.id) as employee_count
       FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.deleted_at IS NULL
       WHERE d.deleted_at IS NULL AND d.tenant_id = :tenantId GROUP BY d.id, d.name ORDER BY employee_count DESC`,
      { replacements: { tenantId } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getLeaveStats(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT l.status, COUNT(*) as count
       FROM leaves l
       WHERE l.deleted_at IS NULL AND l.tenant_id = :tenantId ${dateFilter.clause}
       GROUP BY l.status`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getEmployeeSummary(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as total_employees
       FROM employees WHERE deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getFinancialRevenue(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        COALESCE(SUM(CASE WHEN status IN ('paid', 'delivered') THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END), 0) as cancelled_amount,
        COUNT(*) as total_transactions
       FROM purchase_orders
       WHERE deleted_at IS NULL AND tenant_id = :tenantId ${dateFilter.clause}`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getMonthlyTrend(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as amount
       FROM purchase_orders
       WHERE deleted_at IS NULL AND tenant_id = :tenantId ${dateFilter.clause}
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC
       LIMIT 12`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return rows as unknown as Record<string, unknown>[];
  }

  async getCrmPipeline(tenantId: string, dateFilter: DateFilter) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT l.status, COUNT(*) as count, COALESCE(SUM(l.estimated_value), 0) as total_value
       FROM leads l
       WHERE l.deleted_at IS NULL AND l.tenant_id = :tenantId ${dateFilter.clause}
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
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_leads,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads,
        COALESCE(SUM(CASE WHEN status = 'won' THEN estimated_value ELSE 0 END), 0) as won_value
       FROM leads
       WHERE deleted_at IS NULL AND tenant_id = :tenantId ${dateFilter.clause}`,
      { replacements: { tenantId, ...dateFilter.replacements } },
    );

    return (rows as unknown as any[])[0] || {};
  }

  async getDashboardEmployeeCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM employees WHERE deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardProductCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardOpenLeadsCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM leads WHERE status NOT IN ('won','lost') AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardOpenPOsCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE status NOT IN ('delivered','cancelled') AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardActiveProjectsCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM projects WHERE status = 'active' AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }

  async getDashboardPendingTasksCount(tenantId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done','cancelled') AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );

    return parseInt((rows as unknown as any[])[0]?.count ?? '0');
  }
}
