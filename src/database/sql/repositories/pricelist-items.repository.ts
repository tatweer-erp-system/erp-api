import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PricelistItem } from '../entities/pricelist-item.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PricelistItemsRepository extends BaseRepository<PricelistItem> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(PricelistItem, true);
  }

  async findByPricelistId(tenantId: string, pricelistId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         pi.*,
         pr."nameEn" AS "productNameEn",
         pr."nameAr" AS "productNameAr",
         pr.sku AS "productSku",
         pc."nameEn" AS "categoryNameEn",
         pc."nameAr" AS "categoryNameAr"
       FROM pricelist_items pi
       LEFT JOIN products pr ON pr.id = pi."productId" AND pr."deletedAt" IS NULL
       LEFT JOIN product_categories pc ON pc.id = pi."categoryId" AND pc."deletedAt" IS NULL
       WHERE pi."pricelistId" = :pricelistId AND pi."deletedAt" IS NULL AND pi."tenantId" = :tenantId
       ORDER BY pi.sequence ASC, pi."createdAt" ASC`,
      { replacements: { pricelistId, tenantId } },
    );
    return rows as unknown as any[];
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         pi.*,
         pr."nameEn" AS "productNameEn",
         pr."nameAr" AS "productNameAr",
         pr.sku AS "productSku",
         pc."nameEn" AS "categoryNameEn",
         pc."nameAr" AS "categoryNameAr"
       FROM pricelist_items pi
       LEFT JOIN products pr ON pr.id = pi."productId" AND pr."deletedAt" IS NULL
       LEFT JOIN product_categories pc ON pc.id = pi."categoryId" AND pc."deletedAt" IS NULL
       WHERE pi.id = :id AND pi."deletedAt" IS NULL AND pi."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertItem(
    tenantId: string,
    data: {
      pricelistId: string;
      applyOn?: string;
      productId?: string | null;
      categoryId?: string | null;
      minQty?: number;
      computation?: string;
      price?: number | null;
      discountPct?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      sequence?: number;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO pricelist_items (id, "tenantId", "pricelistId", "applyOn", "productId", "categoryId", "minQty", computation, price, "discountPct", "startDate", "endDate", sequence, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :pricelistId, :applyOn, :productId, :categoryId, :minQty, :computation, :price, :discountPct, :startDate, :endDate, :sequence, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          pricelistId: data.pricelistId,
          applyOn: data.applyOn ?? 'all',
          productId: data.productId ?? null,
          categoryId: data.categoryId ?? null,
          minQty: data.minQty ?? 0,
          computation: data.computation ?? 'fixed',
          price: data.price ?? null,
          discountPct: data.discountPct ?? null,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          sequence: data.sequence ?? 0,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateItem(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE pricelist_items SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteItem(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE pricelist_items SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findMatchingItems(
    tenantId: string,
    pricelistId: string,
    productId: string,
    categoryId: string | null,
    qty: number,
    today: string,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM pricelist_items
       WHERE "pricelistId" = :pricelistId
         AND "tenantId" = :tenantId
         AND "deletedAt" IS NULL
         AND "minQty" <= :qty
         AND (
           ("applyOn" = 'product' AND "productId" = :productId)
           OR ("applyOn" = 'category' AND "categoryId" = :categoryId)
           OR ("applyOn" = 'all')
         )
         AND ("startDate" IS NULL OR "startDate" <= :today)
         AND ("endDate" IS NULL OR "endDate" >= :today)
       ORDER BY
         CASE "applyOn" WHEN 'product' THEN 1 WHEN 'category' THEN 2 ELSE 3 END ASC,
         "minQty" DESC,
         sequence ASC
       LIMIT 1`,
      {
        replacements: {
          pricelistId,
          tenantId,
          productId,
          categoryId: categoryId ?? null,
          qty,
          today,
        },
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }
}
