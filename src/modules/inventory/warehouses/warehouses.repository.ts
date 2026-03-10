import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { Warehouse } from '../../../database/entities/warehouse.entity';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';

@Injectable()
export class WarehousesRepository extends BaseRepository<Warehouse> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Warehouse);
  }

  async getModel(tenantSlug: string): Promise<typeof Warehouse> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('Warehouse')) {
      sequelize.addModels([Warehouse]);
    }
    return Warehouse;
  }
}
