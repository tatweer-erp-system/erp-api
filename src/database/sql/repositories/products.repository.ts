import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

export interface ProductFilterOptions {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortOrder: string;
  productType?: string;
  categoryId?: string;
  brandId?: string;
  branchId?: string;
  canBeSold?: boolean;
  canBePurchased?: boolean;
  hasVariants?: boolean;
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantId: string, options: ProductFilterOptions) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const {
      limit,
      offset,
      search,
      sortBy,
      sortOrder,
      productType,
      categoryId,
      brandId,
      branchId,
      canBeSold,
      canBePurchased,
      hasVariants,
    } = options;

    const replacements: Record<string, unknown> = { tenantId, limit, offset };
    const filters: string[] = [];

    if (search) {
      filters.push(`("nameEn" ILIKE :search OR "nameAr" ILIKE :search OR sku ILIKE :search)`);
      replacements.search = `%${search}%`;
    }
    if (productType) {
      filters.push(`"productType" = :productType`);
      replacements.productType = productType;
    }
    if (categoryId) {
      filters.push(`"categoryId" = :categoryId`);
      replacements.categoryId = categoryId;
    }
    if (brandId) {
      filters.push(`"brandId" = :brandId`);
      replacements.brandId = brandId;
    }
    if (canBeSold !== undefined) {
      filters.push(`"canBeSold" = :canBeSold`);
      replacements.canBeSold = canBeSold;
    }
    if (canBePurchased !== undefined) {
      filters.push(`"canBePurchased" = :canBePurchased`);
      replacements.canBePurchased = canBePurchased;
    }
    if (hasVariants !== undefined) {
      filters.push(`"hasVariants" = :hasVariants`);
      replacements.hasVariants = hasVariants;
    }

    // Branch filtering via join
    let branchJoin = '';
    if (branchId) {
      branchJoin = `INNER JOIN branch_products bp ON bp."productId" = p.id AND bp."branchId" = :branchId AND bp."tenantId" = :tenantId AND bp."deletedAt" IS NULL`;
      replacements.branchId = branchId;
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const orderClause = sortBy
      ? `ORDER BY ${sortBy === 'name' ? 'p."nameEn"' : 'p."createdAt"'} ${sortOrder}`
      : `ORDER BY p."createdAt" ${sortOrder}`;

    const [rows] = await sequelize.query(
      `SELECT p.* FROM products p ${branchJoin}
       WHERE p."deletedAt" IS NULL AND p."tenantId" = :tenantId ${whereClause}
       ${orderClause} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM products p ${branchJoin}
       WHERE p."deletedAt" IS NULL AND p."tenantId" = :tenantId ${whereClause}`,
      { replacements },
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

  /**
   * Fetch product detail with variant count, combo groups count,
   * assigned branch count, and supplier products count.
   */
  async findByIdWithRelations(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT p.*,
         (SELECT COUNT(*) FROM product_variants pv WHERE pv."productId" = p.id AND pv."deletedAt" IS NULL AND pv."tenantId" = :tenantId)::int AS "variantCount",
         (SELECT cp.id FROM combo_products cp WHERE cp."productId" = p.id AND cp."deletedAt" IS NULL AND cp."tenantId" = :tenantId LIMIT 1) AS "comboProductId",
         (SELECT COUNT(*) FROM combo_groups cg
           INNER JOIN combo_products cp2 ON cp2.id = cg."comboId" AND cp2."deletedAt" IS NULL
           WHERE cp2."productId" = p.id AND cg."deletedAt" IS NULL AND cg."tenantId" = :tenantId)::int AS "comboGroupCount",
         (SELECT COUNT(*) FROM branch_products bprod WHERE bprod."productId" = p.id AND bprod."deletedAt" IS NULL AND bprod."tenantId" = :tenantId)::int AS "assignedBranchCount",
         (SELECT COUNT(*) FROM supplier_products sp WHERE sp."productId" = p.id AND sp."deletedAt" IS NULL AND sp."tenantId" = :tenantId)::int AS "supplierCount",
         pc."nameEn" AS "categoryNameEn",
         pc."nameAr" AS "categoryNameAr",
         pb."nameEn" AS "brandNameEn",
         pb."nameAr" AS "brandNameAr"
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p."categoryId" AND pc."deletedAt" IS NULL
       LEFT JOIN product_brands pb ON pb.id = p."brandId" AND pb."deletedAt" IS NULL
       WHERE p.id = :id AND p."deletedAt" IS NULL AND p."tenantId" = :tenantId`,
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
      nameEn: string;
      nameAr: string;
      descriptionEn: string | null;
      descriptionAr: string | null;
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
      productType?: string;
      invoicePolicy?: string;
      canBeSold?: boolean;
      canBePurchased?: boolean;
      hasVariants?: boolean;
      hasSerialTracking?: boolean;
      hasLotTracking?: boolean;
      hasExpiryDate?: boolean;
      brandId?: string | null;
      purchaseUomId?: string | null;
      incomeAccountId?: string | null;
      cogsAccountId?: string | null;
      inventoryAccountId?: string | null;
      stockInputAccountId?: string | null;
      stockOutputAccountId?: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO products (
        id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr",
        sku, barcode, "categoryId", "unitPrice", "costPrice",
        currency, "unitOfMeasure", "reorderPoint", "taxRate", "isActive",
        "productType", "invoicePolicy", "canBeSold", "canBePurchased",
        "hasVariants", "hasSerialTracking", "hasLotTracking", "hasExpiryDate",
        "brandId", "purchaseUomId",
        "incomeAccountId", "cogsAccountId", "inventoryAccountId",
        "stockInputAccountId", "stockOutputAccountId",
        "createdBy", "updatedBy", "createdAt", "updatedAt"
      ) VALUES (
        :id, :tenantId, :nameEn, :nameAr, :descriptionEn, :descriptionAr,
        :sku, :barcode, :categoryId, :unitPrice, :costPrice,
        'SAR', :unitOfMeasure, :reorderPoint, :taxRate, :isActive,
        :productType, :invoicePolicy, :canBeSold, :canBePurchased,
        :hasVariants, :hasSerialTracking, :hasLotTracking, :hasExpiryDate,
        :brandId, :purchaseUomId,
        :incomeAccountId, :cogsAccountId, :inventoryAccountId,
        :stockInputAccountId, :stockOutputAccountId,
        :createdBy, :createdBy, NOW(), NOW()
      )`,
      {
        replacements: {
          id,
          tenantId,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          descriptionEn: data.descriptionEn,
          descriptionAr: data.descriptionAr,
          sku: data.sku,
          barcode: data.barcode,
          categoryId: data.categoryId,
          unitPrice: data.unitPrice,
          costPrice: data.costPrice,
          unitOfMeasure: data.unitOfMeasure,
          reorderPoint: data.reorderPoint,
          taxRate: data.taxRate,
          isActive: data.isActive,
          productType: data.productType ?? 'storable',
          invoicePolicy: data.invoicePolicy ?? 'ordered',
          canBeSold: data.canBeSold ?? true,
          canBePurchased: data.canBePurchased ?? true,
          hasVariants: data.hasVariants ?? false,
          hasSerialTracking: data.hasSerialTracking ?? false,
          hasLotTracking: data.hasLotTracking ?? false,
          hasExpiryDate: data.hasExpiryDate ?? false,
          brandId: data.brandId ?? null,
          purchaseUomId: data.purchaseUomId ?? null,
          incomeAccountId: data.incomeAccountId ?? null,
          cogsAccountId: data.cogsAccountId ?? null,
          inventoryAccountId: data.inventoryAccountId ?? null,
          stockInputAccountId: data.stockInputAccountId ?? null,
          stockOutputAccountId: data.stockOutputAccountId ?? null,
          createdBy: data.createdBy,
        },
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
      ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search OR sku ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", sku FROM products WHERE "deletedAt" IS NULL AND "isActive" = true AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
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
      `SELECT "nameEn", "nameAr" FROM products WHERE id = :id AND "tenantId" = :tenantId`,
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
      `SELECT "nameEn", "nameAr", "reorderPoint" FROM products WHERE id = :productId AND "tenantId" = :tenantId`,
      { replacements: { productId, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  /**
   * Find all products assigned to a specific branch.
   * Used by POS and order modules to enforce branch-level product availability.
   */
  async findAllForBranch(tenantId: string, branchId: string, options: ProductFilterOptions) {
    return this.findAll(tenantId, { ...options, branchId });
  }

  async getTransaction(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    return sequelize.transaction();
  }
}
