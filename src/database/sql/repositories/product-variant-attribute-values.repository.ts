import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ProductVariantAttributeValuesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByVariantId(tenantId: string, variantId: string, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT pvav.*, pav."nameEn" AS "valueNameEn", pav."nameAr" AS "valueNameAr",
              pa."nameEn" AS "attributeNameEn", pa."nameAr" AS "attributeNameAr"
       FROM product_variant_attribute_values pvav
       JOIN product_attribute_values pav ON pav.id = pvav."attributeValueId"
       JOIN product_attributes pa ON pa.id = pav."attributeId"
       WHERE pvav."variantId" = :variantId AND pvav."deletedAt" IS NULL AND pvav."tenantId" = :tenantId`,
      { replacements: { variantId, tenantId }, transaction } as any,
    );
    return rows as unknown as any[];
  }

  async create(
    tenantId: string,
    data: {
      variantId: string;
      attributeValueId: string;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO product_variant_attribute_values (id, "tenantId", "variantId", "attributeValueId", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :variantId, :attributeValueId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: { id, tenantId, ...data },
        transaction,
      } as any,
    );
    return id;
  }

  async softDeleteByVariantId(
    tenantId: string,
    variantId: string,
    updatedBy: string | null,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_variant_attribute_values SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE "variantId" = :variantId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { variantId, tenantId, updatedBy }, transaction } as any,
    );
  }
}
