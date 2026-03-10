import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { Product } from '../../../database/entities/product.entity';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { QueryOptions } from '../../../common/interfaces/repository.interface';

@Injectable()
export class ProductsRepository extends BaseRepository<Product> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Product);
  }

  async getModel(tenantSlug: string): Promise<typeof Product> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('Product')) {
      sequelize.addModels([Product]);
    }
    return Product;
  }

  async findBySku(
    tenantSlug: string,
    sku: string,
    options: QueryOptions = {},
  ): Promise<Product | null> {
    await this.getModel(tenantSlug);
    return this.findOne({
      where: { sku, ...options.where },
      transaction: options.transaction,
    });
  }

  async existsBySku(tenantSlug: string, sku: string, excludeId?: string): Promise<boolean> {
    await this.getModel(tenantSlug);
    const where: Record<string, unknown> = { sku };
    if (excludeId) {
      const { Op } = await import('sequelize');
      where.id = { [Op.ne]: excludeId };
    }
    return this.exists(where);
  }

  async findByCategory(
    tenantSlug: string,
    categoryId: string,
    options: QueryOptions = {},
  ): Promise<Product[]> {
    await this.getModel(tenantSlug);
    return this.findAllRaw({
      where: { categoryId, ...options.where },
      transaction: options.transaction,
    });
  }
}
