import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { Lead } from '../../../database/entities/lead.entity';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';

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
