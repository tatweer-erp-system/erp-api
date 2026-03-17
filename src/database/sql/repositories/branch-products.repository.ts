import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { BranchProduct } from '../entities/branch-product.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class BranchProductsRepository extends BaseRepository<BranchProduct> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(BranchProduct, true);
  }

  async findByBranch(tenantId: string, branchId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT bp.*, p."nameEn" AS "productNameEn", p."nameAr" AS "productNameAr"
       FROM branch_products bp
       LEFT JOIN products p ON p.id = bp."productId" AND p."deletedAt" IS NULL
       WHERE bp."deletedAt" IS NULL AND bp."tenantId" = :tenantId AND bp."branchId" = :branchId
       ORDER BY bp."createdAt" DESC`,
      { replacements: { tenantId, branchId } },
    );
    return rows as unknown as any[];
  }

  async bulkAssign(
    tenantId: string,
    branchId: string,
    productIds: string[],
    createdBy: string | null,
  ): Promise<number> {
    if (productIds.length === 0) return 0;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    let inserted = 0;

    for (const productId of productIds) {
      const id = uuidv7();
      try {
        await sequelize.query(
          `INSERT INTO branch_products (id, "tenantId", "branchId", "productId", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
           SELECT :id, :tenantId, :branchId, :productId, :createdBy, :createdBy, 0, NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM branch_products
             WHERE "tenantId" = :tenantId AND "branchId" = :branchId AND "productId" = :productId AND "deletedAt" IS NULL
           )`,
          {
            replacements: { id, tenantId, branchId, productId, createdBy },
          } as any,
        );
        inserted++;
      } catch {
        // Ignore duplicate constraint violations
      }
    }

    return inserted;
  }

  async bulkUnassign(
    tenantId: string,
    branchId: string,
    productIds: string[],
    updatedBy: string | null,
  ): Promise<number> {
    if (productIds.length === 0) return 0;
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [, metadata] = await sequelize.query(
      `UPDATE branch_products SET "deletedAt" = NOW(), "updatedBy" = :updatedBy
       WHERE "tenantId" = :tenantId AND "branchId" = :branchId AND "productId" IN (:productIds) AND "deletedAt" IS NULL`,
      {
        replacements: { tenantId, branchId, productIds, updatedBy },
      } as any,
    );

    return (metadata as any)?.rowCount ?? 0;
  }
}
