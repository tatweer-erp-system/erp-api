import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { StockMovement } from '../../../database/entities/stock-movement.entity';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { QueryOptions } from '../../../common/interfaces/repository.interface';

@Injectable()
export class StockMovementsRepository extends BaseRepository<StockMovement> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(StockMovement);
  }

  async getModel(tenantSlug: string): Promise<typeof StockMovement> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('StockMovement')) {
      sequelize.addModels([StockMovement]);
    }
    return StockMovement;
  }

  async findByProduct(
    tenantSlug: string,
    productId: string,
    options: QueryOptions = {},
  ): Promise<StockMovement[]> {
    await this.getModel(tenantSlug);
    return this.findAllRaw({
      where: { productId, ...options.where },
      transaction: options.transaction,
    });
  }

  async findByWarehouse(
    tenantSlug: string,
    warehouseId: string,
    options: QueryOptions = {},
  ): Promise<StockMovement[]> {
    await this.getModel(tenantSlug);
    return this.findAllRaw({
      where: { warehouseId, ...options.where },
      transaction: options.transaction,
    });
  }
}
