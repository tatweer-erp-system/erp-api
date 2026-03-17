import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductTemplateAttributeValuesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByTemplateAttributeId(
    tenantId: string,
    templateAttributeId: string,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT ptav.*, pav."nameEn" AS "valueNameEn", pav."nameAr" AS "valueNameAr", pav."htmlColor"
       FROM product_template_attribute_values ptav
       JOIN product_attribute_values pav ON pav.id = ptav."attributeValueId" AND pav."deletedAt" IS NULL
       WHERE ptav."deletedAt" IS NULL AND ptav."tenantId" = :tenantId AND ptav."templateAttributeId" = :templateAttributeId
       ORDER BY pav.sequence ASC`,
      { replacements: { tenantId, templateAttributeId }, transaction } as any,
    );
    return rows as unknown as any[];
  }

  async findActiveByProductId(tenantId: string, productId: string, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT ptav.*, pta."attributeId", pta."productId",
              pav."nameEn" AS "valueNameEn", pav."nameAr" AS "valueNameAr",
              pa."nameEn" AS "attributeNameEn", pa."nameAr" AS "attributeNameAr"
       FROM product_template_attribute_values ptav
       JOIN product_template_attributes pta ON pta.id = ptav."templateAttributeId" AND pta."deletedAt" IS NULL
       JOIN product_attribute_values pav ON pav.id = ptav."attributeValueId" AND pav."deletedAt" IS NULL
       JOIN product_attributes pa ON pa.id = pta."attributeId" AND pa."deletedAt" IS NULL
       WHERE ptav."deletedAt" IS NULL AND ptav."tenantId" = :tenantId AND pta."productId" = :productId AND ptav."isActive" = true
       ORDER BY pta.sequence ASC, pav.sequence ASC`,
      { replacements: { tenantId, productId }, transaction } as any,
    );
    return rows as unknown as any[];
  }

  async create(
    tenantId: string,
    data: {
      templateAttributeId: string;
      attributeValueId: string;
      priceExtra: number;
      isActive: boolean;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO product_template_attribute_values (id, "tenantId", "templateAttributeId", "attributeValueId", "priceExtra", "isActive", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :templateAttributeId, :attributeValueId, :priceExtra, :isActive, :createdBy, :createdBy, NOW(), NOW())`,
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
      `UPDATE product_template_attribute_values SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: { ...replacements, id, tenantId },
        transaction,
      } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_template_attribute_values SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy }, transaction } as any,
    );
  }
}
