import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SupplierProduct } from '../entities/supplier-product.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class SupplierProductsRepository extends BaseRepository<SupplierProduct> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(SupplierProduct, true);
  }

  async findAllPaginated(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      productId?: string;
      partnerId?: string;
      sortOrder: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, productId, partnerId, sortOrder } = options;

    let whereClause = '';
    if (productId) whereClause += ` AND "productId" = :productId`;
    if (partnerId) whereClause += ` AND "partnerId" = :partnerId`;

    const [rows] = await sequelize.query(
      `SELECT * FROM supplier_products WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY sequence ${sortOrder}, "createdAt" DESC LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          tenantId,
          limit,
          offset,
          productId: productId ?? null,
          partnerId: partnerId ?? null,
        },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM supplier_products WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      {
        replacements: {
          tenantId,
          productId: productId ?? null,
          partnerId: partnerId ?? null,
        },
      },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM supplier_products WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async existsByUnique(
    tenantId: string,
    productId: string,
    partnerId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const excludeClause = excludeId ? ` AND id != :excludeId` : '';
    const [existing] = await sequelize.query(
      `SELECT id FROM supplier_products WHERE "productId" = :productId AND "partnerId" = :partnerId AND "deletedAt" IS NULL AND "tenantId" = :tenantId${excludeClause}`,
      {
        replacements: { productId, partnerId, tenantId, excludeId: excludeId ?? null },
      } as any,
    );
    return (existing as unknown as any[]).length > 0;
  }

  async insertSupplierProduct(
    tenantId: string,
    data: {
      productId: string;
      partnerId: string;
      minQty?: number;
      price: number;
      currencyId?: string | null;
      leadTimeDays?: number;
      sequence?: number;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO supplier_products (id, "tenantId", "productId", "partnerId", "minQty", price, "currencyId", "leadTimeDays", sequence, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :partnerId, :minQty, :price, :currencyId, :leadTimeDays, :sequence, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          productId: data.productId,
          partnerId: data.partnerId,
          minQty: data.minQty ?? 1,
          price: data.price,
          currencyId: data.currencyId ?? null,
          leadTimeDays: data.leadTimeDays ?? 0,
          sequence: data.sequence ?? 1,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateSupplierProduct(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE supplier_products SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteSupplierProduct(
    tenantId: string,
    id: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE supplier_products SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }
}
