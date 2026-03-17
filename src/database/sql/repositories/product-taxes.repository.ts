import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductTaxesRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByProductId(tenantId: string, productId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM product_taxes WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "productId" = :productId ORDER BY "createdAt" ASC`,
      { replacements: { tenantId, productId } },
    );
    return rows as unknown as any[];
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM product_taxes WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      productId: string;
      taxId: string;
      scope: string;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO product_taxes (id, "tenantId", "productId", "taxId", scope, "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :productId, :taxId, :scope, :createdBy, :createdBy, NOW(), NOW())`,
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
      `UPDATE product_taxes SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
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
      `UPDATE product_taxes SET "deletedAt" = NOW(), "updatedBy" = :updatedBy
       WHERE "productId" = :productId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { productId, tenantId, updatedBy }, transaction } as any,
    );
  }
}
