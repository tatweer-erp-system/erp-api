import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Lead } from '../entities/lead.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class LeadsRepository extends BaseRepository<Lead> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Lead);
  }

  async getModel(tenantSlug: string): Promise<typeof Lead> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('Lead')) {
      sequelize.addModels([Lead]);
    }
    return Lead;
  }
}
