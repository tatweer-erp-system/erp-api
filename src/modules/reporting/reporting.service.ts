import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { QUEUE_REPORTS } from '../../infrastructure/queues/queue.constants';

@Injectable()
export class ReportingService {
  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    @InjectQueue(QUEUE_REPORTS) private readonly reportsQueue: Queue,
  ) {}

  async getDashboardStats(tenantSlug: string) {
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

    return {
      employees: parseInt((employeeCount as any[])[0]?.count ?? '0'),
      products: parseInt((productCount as any[])[0]?.count ?? '0'),
      openLeads: parseInt((openLeads as any[])[0]?.count ?? '0'),
      openPurchaseOrders: parseInt((openPOs as any[])[0]?.count ?? '0'),
    };
  }

  async getHrReport(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [byDept] = await sequelize.query(
      `SELECT d.name, COUNT(e.id) as employee_count
       FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.deleted_at IS NULL
       WHERE d.deleted_at IS NULL GROUP BY d.id, d.name ORDER BY employee_count DESC`,
      { type: 'SELECT' } as any,
    );
    return { byDepartment: byDept };
  }

  async getInventoryReport(tenantSlug: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [lowStock] = await sequelize.query(
      `SELECT p.name, sl.quantity, p.reorder_point, w.name as warehouse
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id
       JOIN warehouses w ON w.id = sl.warehouse_id
       WHERE sl.quantity <= p.reorder_point AND p.deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );
    return { lowStockItems: lowStock };
  }

  async exportReport(
    tenantSlug: string,
    reportType: string,
    filters: Record<string, unknown>,
    requestedBy: string,
    format: 'pdf' | 'csv' = 'pdf',
  ) {
    const job = await this.reportsQueue.add(
      'export',
      { tenantSlug, reportType, filters, requestedBy, format },
      { attempts: 2 },
    );
    return { jobId: job.id, status: 'queued' };
  }
}
