import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortBy?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortBy, sortOrder } = options;

    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search OR sku ILIKE :search)`
      : '';

    const orderClause = sortBy
      ? `ORDER BY ${sortBy === 'name' ? `name->>'en'` : '"createdAt"'} ${sortOrder}`
      : `ORDER BY "createdAt" ${sortOrder}`;

    const [rows] = await sequelize.query(
      `SELECT * FROM products WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ${orderClause} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM products WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM products WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findByIdIncludingDeleted(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM products WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { id, tenantId },
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findExistingBySku(tenantId: string, sku: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id FROM products WHERE sku = :sku AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { sku, tenantId } },
    );
    return rows as unknown as any[];
  }

  async findExistingBySkus(tenantId: string, skus: string[], transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT sku FROM products WHERE sku IN (:skus) AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { skus, tenantId }, transaction } as any,
    );
    return (rows as unknown as any[]).map((r: any) => r.sku);
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      description: string | null;
      sku: string;
      barcode: string | null;
      categoryId: string;
      unitPrice: number;
      costPrice: number | null;
      unitOfMeasure: string;
      reorderPoint: number;
      taxRate: number;
      isActive: boolean;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO products (id, "tenantId", name, description, sku, barcode, "categoryId", "unitPrice", "costPrice",
       currency, "unitOfMeasure", "reorderPoint", "taxRate", "isActive", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :name, :description, :sku, :barcode, :categoryId, :unitPrice, :costPrice,
       'SAR', :unitOfMeasure, :reorderPoint, :taxRate, :isActive, :createdBy, :createdBy, NOW(), NOW())`,
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
      `UPDATE products SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, id, tenantId },
        transaction,
      } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE products SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async restore(tenantId: string, id: string, updatedBy: string | null) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE products SET "deletedAt" = NULL, "updatedBy" = :updatedBy, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findForDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search OR sku ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, name, sku FROM products WHERE "deletedAt" IS NULL AND "isActive" = true AND "tenantId" = :tenantId ${whereClause} ORDER BY name->>'en' LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }

  async findExistingByIds(tenantId: string, ids: string[], transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id FROM products WHERE id IN (:ids) AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { ids, tenantId }, transaction } as any,
    );
    return (rows as unknown as any[]).map((r: any) => r.id);
  }

  async findNameById(tenantId: string, id: string, transaction?: any) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT name FROM products WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { id, tenantId },
        transaction,
      } as any,
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findProductReorderInfo(tenantId: string, productId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT name, "reorderPoint" FROM products WHERE id = :productId AND "tenantId" = :tenantId`,
      { replacements: { productId, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async getTransaction(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    return sequelize.transaction();
  }
}
