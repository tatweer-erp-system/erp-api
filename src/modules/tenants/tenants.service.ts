import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(): Promise<Tenant[]> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    shared.addModels([Tenant]);
    return Tenant.findAll({ order: [['createdAt', 'DESC']] });
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    shared.addModels([Tenant]);
    const tenant = await Tenant.findOne({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Tenant '${slug}' not found`);
    return tenant;
  }

  async findById(id: string): Promise<Tenant> {
    const shared = this.tenantSequelizeService.getSharedSequelize();
    shared.addModels([Tenant]);
    const tenant = await Tenant.findByPk(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async deactivate(id: string): Promise<void> {
    const tenant = await this.findById(id);
    await tenant.update({ isActive: false });
  }
}
