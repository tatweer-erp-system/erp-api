import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ProductVariantsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByProductId(
    tenantId: string,
    productId: string,
    options: { limit: number; offset: number },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset } = options;

    const [rows] = await sequelize.query(
      `SELECT * FROM product_variants WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "productId" = :productId ORDER BY "combinationName" ASC LIMIT :limit OFFSET :offset`,
      { replacements: { tenantId, productId, limit, offset } } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM product_variants WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "productId" = :productId`,
      { replacements: { tenantId, productId } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM product_variants WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findByIdWithAttributes(tenantId: string, id: string) {
    const variant = await this.findById(tenantId, id);
    if (!variant) return null;

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [attrRows] = await sequelize.query(
      `SELECT pvav.*, pav."nameEn" AS "valueNameEn", pav."nameAr" AS "valueNameAr",
              pa."nameEn" AS "attributeNameEn", pa."nameAr" AS "attributeNameAr"
       FROM product_variant_attribute_values pvav
       JOIN product_attribute_values pav ON pav.id = pvav."attributeValueId"
       JOIN product_attributes pa ON pa.id = pav."attributeId"
       WHERE pvav."variantId" = :variantId AND pvav."deletedAt" IS NULL AND pvav."tenantId" = :tenantId`,
      { replacements: { variantId: id, tenantId } },
    );
    (variant as any).attributeValues = attrRows;
    return variant;
  }

  async create(
    tenantId: string,
    data: {
      productId: string;
      combinationName: string | null;
      barcode: string | null;
      internalRef: string | null;
      priceExtra: number;
      costPrice: number | null;
      isActive: boolean;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO product_variants (id, "tenantId", "productId", "combinationName", barcode, "internalRef", "priceExtra", "costPrice", "isActive", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :combinationName, :barcode, :internalRef, :priceExtra, :costPrice, :isActive, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: { id, tenantId, ...data },
        transaction,
      } as any,
    );
    return id;
  }

  async update(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_variants SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: { ...replacements, id, tenantId },
        transaction,
      } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_variants SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy }, transaction } as any,
    );
  }

  async softDeleteByProductId(
    tenantId: string,
    productId: string,
    updatedBy: string | null,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_variants SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE "productId" = :productId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { productId, tenantId, updatedBy }, transaction } as any,
    );
  }

  async getTransaction() {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    return sequelize.transaction();
  }
}
