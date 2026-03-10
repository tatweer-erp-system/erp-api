import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Warehouse } from '../entities/warehouse.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

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
