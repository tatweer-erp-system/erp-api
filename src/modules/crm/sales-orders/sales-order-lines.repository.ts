import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { SalesOrderLine } from '../../../database/entities/sales-order-line.entity';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { QueryOptions } from '../../../common/interfaces/repository.interface';

@Injectable()
export class SalesOrderLinesRepository extends BaseRepository<SalesOrderLine> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SalesOrderLine);
  }

  async getModel(tenantSlug: string): Promise<typeof SalesOrderLine> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('SalesOrderLine')) {
      sequelize.addModels([SalesOrderLine]);
    }
    return SalesOrderLine;
  }

  async findByOrderId(
    tenantSlug: string,
    orderId: string,
    options: QueryOptions = {},
  ): Promise<SalesOrderLine[]> {
    await this.getModel(tenantSlug);
    return this.findAllRaw({
      where: { orderId, ...options.where },
      transaction: options.transaction,
    });
  }
}
