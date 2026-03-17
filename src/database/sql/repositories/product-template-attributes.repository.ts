import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductTemplateAttributesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByProductId(tenantId: string, productId: string, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT pta.*, pa."nameEn" AS "attributeNameEn", pa."nameAr" AS "attributeNameAr", pa."displayType"
       FROM product_template_attributes pta
       JOIN product_attributes pa ON pa.id = pta."attributeId" AND pa."deletedAt" IS NULL
       WHERE pta."deletedAt" IS NULL AND pta."tenantId" = :tenantId AND pta."productId" = :productId
       ORDER BY pta.sequence ASC`,
      { replacements: { tenantId, productId }, transaction } as any,
    );
    return rows as unknown as any[];
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM product_template_attributes WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      productId: string;
      attributeId: string;
      sequence: number;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO product_template_attributes (id, "tenantId", "productId", "attributeId", sequence, "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :attributeId, :sequence, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: { id, tenantId, ...data },
        transaction,
      } as any,
    );
    return id;
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE product_template_attributes SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy }, transaction } as any,
    );
  }

  async existsByProductAndAttribute(
    tenantId: string,
    productId: string,
    attributeId: string,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id FROM product_template_attributes WHERE "tenantId" = :tenantId AND "productId" = :productId AND "attributeId" = :attributeId AND "deletedAt" IS NULL`,
      { replacements: { tenantId, productId, attributeId }, transaction } as any,
    );
    return (rows as unknown as any[]).length > 0;
  }
}
