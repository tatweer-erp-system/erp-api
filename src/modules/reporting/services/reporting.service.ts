import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import { QUEUE_REPORTS } from '@/infrastructure/queues/queue.constants';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ExportReportDto } from '../dto/export-report.dto';
import { ReportResult } from '../interfaces/report.interface';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    @InjectQueue(QUEUE_REPORTS) private readonly reportsQueue: Queue,
  ) {}

  async getSalesReport(tenantSlug: string, query: ReportQueryDto): Promise<ReportResult> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const dateFilter = this.buildDateFilter('po.created_at', query);

    const [salesByStatus] = await sequelize.query(
      `SELECT po.status, COUNT(*) as order_count, COALESCE(SUM(po.total_amount), 0) as total_amount
       FROM purchase_orders po
       WHERE po.deleted_at IS NULL ${dateFilter.clause}
       GROUP BY po.status
       ORDER BY total_amount DESC`,
      { replacements: dateFilter.replacements, type: 'SELECT' } as any,
    );

    const [salesSummary] = await sequelize.query(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_order_value
       FROM purchase_orders
       WHERE deleted_at IS NULL ${dateFilter.clause}`,
      { replacements: dateFilter.replacements, type: 'SELECT' } as any,
    );

    return {
      reportType: 'sales',
      generatedAt: new Date(),
      filters: query,
      data: salesByStatus as unknown as Record<string, unknown>[],
      summary: (salesSummary as unknown as any[])[0] || {},
    };
  }

  async getInventoryReport(tenantSlug: string, query: ReportQueryDto): Promise<ReportResult> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [lowStock] = await sequelize.query(
      `SELECT p.name, sl.quantity, p.reorder_point, w.name as warehouse
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id
       JOIN warehouses w ON w.id = sl.warehouse_id
       WHERE sl.quantity <= p.reorder_point AND p.deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );

    const [stockSummary] = await sequelize.query(
      `SELECT
        COUNT(DISTINCT sl.product_id) as total_products_in_stock,
        COUNT(DISTINCT sl.warehouse_id) as total_warehouses,
        COALESCE(SUM(sl.quantity), 0) as total_quantity
       FROM stock_levels sl`,
      { type: 'SELECT' } as any,
    );

    return {
      reportType: 'inventory',
      generatedAt: new Date(),
      filters: query,
      data: lowStock as unknown as Record<string, unknown>[],
      summary: (stockSummary as unknown as any[])[0] || {},
    };
  }

  async getHrReport(tenantSlug: string, query: ReportQueryDto): Promise<ReportResult> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [byDept] = await sequelize.query(
      `SELECT d.name, COUNT(e.id) as employee_count
       FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.deleted_at IS NULL
       WHERE d.deleted_at IS NULL GROUP BY d.id, d.name ORDER BY employee_count DESC`,
      { type: 'SELECT' } as any,
    );

    const dateFilter = this.buildDateFilter('l.start_date', query);

    const [leaveStats] = await sequelize.query(
      `SELECT l.status, COUNT(*) as count
       FROM leaves l
       WHERE l.deleted_at IS NULL ${dateFilter.clause}
       GROUP BY l.status`,
      { replacements: dateFilter.replacements, type: 'SELECT' } as any,
    );

    const [employeeSummary] = await sequelize.query(
      `SELECT COUNT(*) as total_employees
       FROM employees WHERE deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );

    return {
      reportType: 'hr',
      generatedAt: new Date(),
      filters: query,
      data: [
        ...(byDept as unknown as Record<string, unknown>[]),
        ...(leaveStats as unknown as Record<string, unknown>[]),
      ],
      summary: (employeeSummary as unknown as any[])[0] || {},
    };
  }

  async getFinancialReport(tenantSlug: string, query: ReportQueryDto): Promise<ReportResult> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const dateFilter = this.buildDateFilter('created_at', query);

    const [revenue] = await sequelize.query(
      `SELECT
        COALESCE(SUM(CASE WHEN status IN ('paid', 'delivered') THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END), 0) as cancelled_amount,
        COUNT(*) as total_transactions
       FROM purchase_orders
       WHERE deleted_at IS NULL ${dateFilter.clause}`,
      { replacements: dateFilter.replacements, type: 'SELECT' } as any,
    );

    const [monthlyTrend] = await sequelize.query(
      `SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as amount
       FROM purchase_orders
       WHERE deleted_at IS NULL ${dateFilter.clause}
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC
       LIMIT 12`,
      { replacements: dateFilter.replacements, type: 'SELECT' } as any,
    );

    return {
      reportType: 'financial',
      generatedAt: new Date(),
      filters: query,
      data: monthlyTrend as unknown as Record<string, unknown>[],
      summary: (revenue as unknown as any[])[0] || {},
    };
  }

  async getCrmReport(tenantSlug: string, query: ReportQueryDto): Promise<ReportResult> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const dateFilter = this.buildDateFilter('l.created_at', query);

    const [pipeline] = await sequelize.query(
      `SELECT l.status, COUNT(*) as count, COALESCE(SUM(l.estimated_value), 0) as total_value
       FROM leads l
       WHERE l.deleted_at IS NULL ${dateFilter.clause}
       GROUP BY l.status
       ORDER BY count DESC`,
      { replacements: dateFilter.replacements, type: 'SELECT' } as any,
    );

    const [summary] = await sequelize.query(
      `SELECT
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_leads,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads,
        COALESCE(SUM(CASE WHEN status = 'won' THEN estimated_value ELSE 0 END), 0) as won_value
       FROM leads
       WHERE deleted_at IS NULL ${dateFilter.clause}`,
      { replacements: dateFilter.replacements, type: 'SELECT' } as any,
    );

    return {
      reportType: 'crm',
      generatedAt: new Date(),
      filters: query,
      data: pipeline as unknown as Record<string, unknown>[],
      summary: (summary as unknown as any[])[0] || {},
    };
  }

  async getDashboard(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [employeeCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM employees WHERE deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );
    const [productCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );
    const [openLeads] = await sequelize.query(
      `SELECT COUNT(*) as count FROM leads WHERE status NOT IN ('won','lost') AND deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );
    const [openPOs] = await sequelize.query(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE status NOT IN ('delivered','cancelled') AND deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );
    const [activeProjects] = await sequelize.query(
      `SELECT COUNT(*) as count FROM projects WHERE status = 'active' AND deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );
    const [pendingTasks] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done','cancelled') AND deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );

    return {
      employees: parseInt((employeeCount as unknown as any[])[0]?.count ?? '0'),
      products: parseInt((productCount as unknown as any[])[0]?.count ?? '0'),
      openLeads: parseInt((openLeads as unknown as any[])[0]?.count ?? '0'),
      openPurchaseOrders: parseInt((openPOs as unknown as any[])[0]?.count ?? '0'),
      activeProjects: parseInt((activeProjects as unknown as any[])[0]?.count ?? '0'),
      pendingTasks: parseInt((pendingTasks as unknown as any[])[0]?.count ?? '0'),
    };
  }

  async exportReport(tenantSlug: string, dto: ExportReportDto, userId: string) {
    const job = await this.reportsQueue.add(
      'export',
      {
        tenantSlug,
        reportType: dto.reportType,
        format: dto.format,
        filters: {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
        requestedBy: userId,
      },
      { attempts: 2 },
    );

    return { jobId: job.id, status: 'queued' };
  }

  private buildDateFilter(
    column: string,
    query: ReportQueryDto,
  ): { clause: string; replacements: Record<string, string> } {
    const parts: string[] = [];
    const replacements: Record<string, string> = {};

    if (query.startDate) {
      parts.push(`AND ${column} >= :startDate`);
      replacements.startDate = query.startDate;
    }
    if (query.endDate) {
      parts.push(`AND ${column} <= :endDate`);
      replacements.endDate = query.endDate;
    }

    return { clause: parts.join(' '), replacements };
  }
}
