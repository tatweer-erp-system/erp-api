import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { StockLevel } from '../entities/stock-level.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { QueryOptions } from '../../common/interfaces/repository.interface';

@Injectable()
export class StockLevelsRepository extends BaseRepository<StockLevel> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(StockLevel);
  }

  async getModel(tenantSlug: string): Promise<typeof StockLevel> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('StockLevel')) {
      sequelize.addModels([StockLevel]);
    }
    return StockLevel;
  }

  async findByProductAndWarehouse(
    tenantSlug: string,
    productId: string,
    warehouseId: string,
    options: QueryOptions = {},
  ): Promise<StockLevel | null> {
    await this.getModel(tenantSlug);
    return this.findOne({
      where: { productId, warehouseId, ...options.where },
      transaction: options.transaction,
    });
  }

  async getLowStockItems(tenantSlug: string, warehouseId?: string): Promise<StockLevel[]> {
    await this.getModel(tenantSlug);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const warehouseFilter = warehouseId ? 'AND sl.warehouse_id = :warehouseId' : '';
    const [rows] = await sequelize.query(
      `SELECT sl.*, p.name as product_name, p.reorder_point, w.name as warehouse_name
       FROM stock_levels sl
       JOIN products p ON p.id = sl.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = sl.warehouse_id AND w.deleted_at IS NULL
       WHERE sl.quantity <= p.reorder_point ${warehouseFilter}
       ORDER BY sl.quantity ASC`,
      {
        replacements: { warehouseId: warehouseId ?? null },
        type: 'SELECT',
      } as any,
    );
    return rows as unknown as StockLevel[];
  }
}
