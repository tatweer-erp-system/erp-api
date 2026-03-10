import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { BulkCreateProductsDto } from '../dto/bulk-create-products.dto';
import { BulkUpdateProductsDto } from '../dto/bulk-update-products.dto';
import { BulkDeleteProductsDto } from '../dto/bulk-delete-products.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';

@Injectable()
export class ProductsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, search, page = 1, sortBy, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search OR sku ILIKE :search)`
      : '';

    const orderClause = sortBy
      ? `ORDER BY ${sortBy === 'name' ? `name->>'en'` : 'created_at'} ${sortOrder}`
      : `ORDER BY created_at ${sortOrder}`;

    const [rows] = await sequelize.query(
      `SELECT * FROM products WHERE deleted_at IS NULL ${whereClause} ${orderClause} LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL ${whereClause}`,
      { replacements: { search: search ? `%${search}%` : '' }, type: 'SELECT' } as any,
    );
    const total = parseInt((countResult as any[])[0]?.total ?? '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM products WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const product = (rows as any[])[0];
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(tenantSlug: string, dto: CreateProductDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Check SKU uniqueness
    const [existing] = await sequelize.query(
      `SELECT id FROM products WHERE sku = :sku AND deleted_at IS NULL`,
      { replacements: { sku: dto.sku }, type: 'SELECT' } as any,
    );
    if ((existing as any[]).length > 0) {
      throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
    }

    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO products (id, name, description, sku, barcode, category_id, unit_price, cost_price,
       currency, unit_of_measure, reorder_point, tax_rate, is_active, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :description, :sku, :barcode, :categoryId, :unitPrice, :costPrice,
       'SAR', :unitOfMeasure, :reorderPoint, :taxRate, :isActive, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          name: JSON.stringify({ en: dto.name_en, ar: dto.name_ar }),
          description:
            dto.description_en || dto.description_ar
              ? JSON.stringify({ en: dto.description_en ?? '', ar: dto.description_ar ?? '' })
              : null,
          sku: dto.sku,
          barcode: dto.barcode ?? null,
          categoryId: dto.categoryId,
          unitPrice: dto.unitPrice,
          costPrice: dto.costPrice ?? null,
          unitOfMeasure: dto.unit ?? 'pcs',
          reorderPoint: dto.minStockLevel ?? 0,
          taxRate: dto.taxRate ?? 15,
          isActive: dto.isActive ?? true,
          createdBy: auditContext.userId ?? null,
        },
      } as any,
    );
    return this.findById(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateProductDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.name_en !== undefined || dto.name_ar !== undefined) {
      const currentName =
        typeof existing.name === 'string' ? JSON.parse(existing.name) : existing.name;
      updates.push('name = :name');
      replacements.name = JSON.stringify({
        en: dto.name_en ?? currentName?.en ?? '',
        ar: dto.name_ar ?? currentName?.ar ?? '',
      });
    }
    if (dto.description_en !== undefined || dto.description_ar !== undefined) {
      const currentDesc =
        typeof existing.description === 'string'
          ? JSON.parse(existing.description ?? '{}')
          : existing.description;
      updates.push('description = :description');
      replacements.description = JSON.stringify({
        en: dto.description_en ?? currentDesc?.en ?? '',
        ar: dto.description_ar ?? currentDesc?.ar ?? '',
      });
    }
    if (dto.categoryId !== undefined) {
      updates.push('category_id = :categoryId');
      replacements.categoryId = dto.categoryId;
    }
    if (dto.unitPrice !== undefined) {
      updates.push('unit_price = :unitPrice');
      replacements.unitPrice = dto.unitPrice;
    }
    if (dto.costPrice !== undefined) {
      updates.push('cost_price = :costPrice');
      replacements.costPrice = dto.costPrice;
    }
    if (dto.taxRate !== undefined) {
      updates.push('tax_rate = :taxRate');
      replacements.taxRate = dto.taxRate;
    }
    if (dto.barcode !== undefined) {
      updates.push('barcode = :barcode');
      replacements.barcode = dto.barcode;
    }
    if (dto.unit !== undefined) {
      updates.push('unit_of_measure = :unitOfMeasure');
      replacements.unitOfMeasure = dto.unit;
    }
    if (dto.minStockLevel !== undefined) {
      updates.push('reorder_point = :reorderPoint');
      replacements.reorderPoint = dto.minStockLevel;
    }
    if (dto.isActive !== undefined) {
      updates.push('is_active = :isActive');
      replacements.isActive = dto.isActive;
    }

    await sequelize.query(`UPDATE products SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE products SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
    );
  }

  async restore(tenantSlug: string, id: string, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(`SELECT * FROM products WHERE id = :id`, {
      replacements: { id },
      type: 'SELECT',
    } as any);
    const product = (rows as any[])[0];
    if (!product) throw new NotFoundException('Product not found');
    if (!product.deleted_at) throw new BadRequestException('Product is not deleted');

    await sequelize.query(
      `UPDATE products SET deleted_at = NULL, updated_by = :updatedBy, updated_at = NOW() WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
    );
    return this.findById(tenantSlug, id);
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { search, limit = 50 } = query;
    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search OR sku ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, name, sku FROM products WHERE deleted_at IS NULL AND is_active = true ${whereClause} ORDER BY name->>'en' LIMIT :limit`,
      {
        replacements: { limit, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );
    return rows;
  }

  async bulkCreate(tenantSlug: string, dto: BulkCreateProductsDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const transaction = await sequelize.transaction();

    try {
      // Validate all SKUs are unique within the batch
      const skus = dto.items.map((item) => item.sku);
      const uniqueSkus = new Set(skus);
      if (uniqueSkus.size !== skus.length) {
        throw new BadRequestException('Duplicate SKUs found within the batch');
      }

      // Check all SKUs against DB
      const [existingRows] = await sequelize.query(
        `SELECT sku FROM products WHERE sku IN (:skus) AND deleted_at IS NULL`,
        { replacements: { skus }, type: 'SELECT', transaction } as any,
      );
      const existingSkus = (existingRows as any[]).map((r: any) => r.sku);
      if (existingSkus.length > 0) {
        throw new ConflictException(`Products with SKUs already exist: ${existingSkus.join(', ')}`);
      }

      const results: { index: number; id: string; status: string }[] = [];

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const id = uuidv4();
        await sequelize.query(
          `INSERT INTO products (id, name, description, sku, barcode, category_id, unit_price, cost_price,
           currency, unit_of_measure, reorder_point, tax_rate, is_active, created_by, updated_by, created_at, updated_at)
           VALUES (:id, :name, :description, :sku, :barcode, :categoryId, :unitPrice, :costPrice,
           'SAR', :unitOfMeasure, :reorderPoint, :taxRate, :isActive, :createdBy, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id,
              name: JSON.stringify({ en: item.name_en, ar: item.name_ar }),
              description:
                item.description_en || item.description_ar
                  ? JSON.stringify({ en: item.description_en ?? '', ar: item.description_ar ?? '' })
                  : null,
              sku: item.sku,
              barcode: item.barcode ?? null,
              categoryId: item.categoryId,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice ?? null,
              unitOfMeasure: item.unit ?? 'pcs',
              reorderPoint: item.minStockLevel ?? 0,
              taxRate: item.taxRate ?? 15,
              isActive: item.isActive ?? true,
              createdBy: auditContext.userId ?? null,
            },
            transaction,
          } as any,
        );
        results.push({ index: i, id, status: 'created' });
      }

      await transaction.commit();

      return {
        succeeded: results.length,
        failed: 0,
        results,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async bulkUpdate(tenantSlug: string, dto: BulkUpdateProductsDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const transaction = await sequelize.transaction();

    try {
      // Validate all IDs exist
      const ids = dto.items.map((item) => item.id);
      const [existingRows] = await sequelize.query(
        `SELECT id FROM products WHERE id IN (:ids) AND deleted_at IS NULL`,
        { replacements: { ids }, type: 'SELECT', transaction } as any,
      );
      const existingIds = new Set((existingRows as any[]).map((r: any) => r.id));
      const missingIds = ids.filter((id) => !existingIds.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
      }

      const results: { index: number; id: string; status: string }[] = [];

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
        const replacements: Record<string, unknown> = {
          id: item.id,
          updatedBy: auditContext.userId ?? null,
        };

        if (item.name_en !== undefined || item.name_ar !== undefined) {
          // Fetch current name for merging
          const [currentRows] = await sequelize.query(`SELECT name FROM products WHERE id = :id`, {
            replacements: { id: item.id },
            type: 'SELECT',
            transaction,
          } as any);
          const currentName = (currentRows as any[])[0]?.name ?? { en: '', ar: '' };
          const parsedName =
            typeof currentName === 'string' ? JSON.parse(currentName) : currentName;
          updates.push('name = :name');
          replacements.name = JSON.stringify({
            en: item.name_en ?? parsedName.en ?? '',
            ar: item.name_ar ?? parsedName.ar ?? '',
          });
        }
        if (item.description_en !== undefined || item.description_ar !== undefined) {
          updates.push('description = :description');
          replacements.description = JSON.stringify({
            en: item.description_en ?? '',
            ar: item.description_ar ?? '',
          });
        }
        if (item.categoryId !== undefined) {
          updates.push('category_id = :categoryId');
          replacements.categoryId = item.categoryId;
        }
        if (item.unitPrice !== undefined) {
          updates.push('unit_price = :unitPrice');
          replacements.unitPrice = item.unitPrice;
        }
        if (item.costPrice !== undefined) {
          updates.push('cost_price = :costPrice');
          replacements.costPrice = item.costPrice;
        }
        if (item.taxRate !== undefined) {
          updates.push('tax_rate = :taxRate');
          replacements.taxRate = item.taxRate;
        }
        if (item.barcode !== undefined) {
          updates.push('barcode = :barcode');
          replacements.barcode = item.barcode;
        }
        if (item.unit !== undefined) {
          updates.push('unit_of_measure = :unitOfMeasure');
          replacements.unitOfMeasure = item.unit;
        }
        if (item.minStockLevel !== undefined) {
          updates.push('reorder_point = :reorderPoint');
          replacements.reorderPoint = item.minStockLevel;
        }
        if (item.maxStockLevel !== undefined) {
          // maxStockLevel is tracked via minStockLevel/reorderPoint in entity
          // no direct column, skip or store in metadata
        }
        if (item.isActive !== undefined) {
          updates.push('is_active = :isActive');
          replacements.isActive = item.isActive;
        }

        await sequelize.query(`UPDATE products SET ${updates.join(', ')} WHERE id = :id`, {
          replacements,
          transaction,
        } as any);
        results.push({ index: i, id: item.id, status: 'updated' });
      }

      await transaction.commit();

      return {
        succeeded: results.length,
        failed: 0,
        results,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async bulkDelete(tenantSlug: string, dto: BulkDeleteProductsDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const results: { index: number; id: string; status: string; error?: string }[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < dto.ids.length; i++) {
      const id = dto.ids[i];
      try {
        const [rows] = await sequelize.query(
          `SELECT id FROM products WHERE id = :id AND deleted_at IS NULL`,
          { replacements: { id }, type: 'SELECT' } as any,
        );
        if ((rows as any[]).length === 0) {
          results.push({ index: i, id, status: 'failed', error: 'Product not found' });
          failed++;
          continue;
        }
        await sequelize.query(
          `UPDATE products SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id`,
          { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
        );
        results.push({ index: i, id, status: 'deleted' });
        succeeded++;
      } catch (error: any) {
        results.push({ index: i, id, status: 'failed', error: error.message });
        failed++;
      }
    }

    return { succeeded, failed, results };
  }
}
