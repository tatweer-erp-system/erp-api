import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SalesOrder } from '../entities/sales-order.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class SalesOrdersRepository extends BaseRepository<SalesOrder> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SalesOrder);
  }

  async getModel(tenantSlug: string): Promise<typeof SalesOrder> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('SalesOrder')) {
      sequelize.addModels([SalesOrder]);
    }
    return SalesOrder;
  }

  async getNextInvoiceCounter(tenantSlug: string): Promise<number> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [result] = await sequelize.query(
      `SELECT COALESCE(MAX(zatca_invoice_counter), 0) + 1 as next_counter FROM sales_orders`,
      { type: 'SELECT' } as any,
    );
    return parseInt((result as unknown as any[])[0]?.next_counter ?? '1', 10);
  }
}
