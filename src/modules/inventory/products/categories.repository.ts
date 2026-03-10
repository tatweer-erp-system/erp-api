import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { ProductCategory } from '../../../database/entities/product-category.entity';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';

@Injectable()
export class CategoriesRepository extends BaseRepository<ProductCategory> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(ProductCategory);
  }

  async getModel(tenantSlug: string): Promise<typeof ProductCategory> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('ProductCategory')) {
      sequelize.addModels([ProductCategory]);
    }
    return ProductCategory;
  }
}
