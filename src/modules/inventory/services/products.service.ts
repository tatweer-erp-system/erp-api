import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { BulkCreateProductsDto } from '../dto/bulk-create-products.dto';
import { BulkUpdateProductsDto } from '../dto/bulk-update-products.dto';
import { BulkDeleteProductsDto } from '../dto/bulk-delete-products.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
  ) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1, sortBy, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.productsRepository.findAll(tenantId, {
      limit,
      offset,
      search,
      sortBy,
      sortOrder,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const product = await this.productsRepository.findById(tenantId, id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto, auditContext: AuditContext) {
    // Check SKU uniqueness
    const existing = await this.productsRepository.findExistingBySku(tenantId, dto.sku);
    if (existing.length > 0) {
      throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
    }

    const id = await this.productsRepository.create(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionAr: dto.descriptionAr ?? null,
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
    });
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);

    // Optimistic locking check
    if (existing.version !== dto.version) {
      throw new ConflictException('Record was modified by another user');
    }

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = {
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.nameEn !== undefined) {
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }
    if (dto.descriptionEn !== undefined) {
      updates.push('"descriptionEn" = :descriptionEn');
      replacements.descriptionEn = dto.descriptionEn;
    }
    if (dto.descriptionAr !== undefined) {
      updates.push('"descriptionAr" = :descriptionAr');
      replacements.descriptionAr = dto.descriptionAr;
    }
    if (dto.categoryId !== undefined) {
      updates.push('"categoryId" = :categoryId');
      replacements.categoryId = dto.categoryId;
    }
    if (dto.unitPrice !== undefined) {
      updates.push('"unitPrice" = :unitPrice');
      replacements.unitPrice = dto.unitPrice;
    }
    if (dto.costPrice !== undefined) {
      updates.push('"costPrice" = :costPrice');
      replacements.costPrice = dto.costPrice;
    }
    if (dto.taxRate !== undefined) {
      updates.push('"taxRate" = :taxRate');
      replacements.taxRate = dto.taxRate;
    }
    if (dto.barcode !== undefined) {
      updates.push('barcode = :barcode');
      replacements.barcode = dto.barcode;
    }
    if (dto.unit !== undefined) {
      updates.push('"unitOfMeasure" = :unitOfMeasure');
      replacements.unitOfMeasure = dto.unit;
    }
    if (dto.minStockLevel !== undefined) {
      updates.push('"reorderPoint" = :reorderPoint');
      replacements.reorderPoint = dto.minStockLevel;
    }
    if (dto.isActive !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isActive;
    }

    await this.productsRepository.update(tenantId, id, updates, replacements);

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantId, id);
    await this.productsRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  async restore(tenantId: string, id: string, auditContext: AuditContext) {
    const product = await this.productsRepository.findByIdIncludingDeleted(tenantId, id);
    if (!product) throw new NotFoundException('Product not found');
    if (!product.deletedAt) throw new BadRequestException('Product is not deleted');

    await this.productsRepository.restore(tenantId, id, auditContext.userId ?? null);
    return this.findById(tenantId, id);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.productsRepository.findForDropdown(tenantId, { search, limit });
  }

  async bulkCreate(tenantId: string, dto: BulkCreateProductsDto, auditContext: AuditContext) {
    const transaction = await this.productsRepository.getTransaction(tenantId);

    try {
      // Validate all SKUs are unique within the batch
      const skus = dto.items.map((item) => item.sku);
      const uniqueSkus = new Set(skus);
      if (uniqueSkus.size !== skus.length) {
        throw new BadRequestException('Duplicate SKUs found within the batch');
      }

      // Check all SKUs against DB
      const existingSkus = await this.productsRepository.findExistingBySkus(
        tenantId,
        skus,
        transaction,
      );
      if (existingSkus.length > 0) {
        throw new ConflictException(`Products with SKUs already exist: ${existingSkus.join(', ')}`);
      }

      const results: { index: number; id: string; status: string }[] = [];

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const id = await this.productsRepository.create(
          tenantId,
          {
            nameEn: item.nameEn,
            nameAr: item.nameAr,
            descriptionEn: item.descriptionEn ?? null,
            descriptionAr: item.descriptionAr ?? null,
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

  async bulkUpdate(tenantId: string, dto: BulkUpdateProductsDto, auditContext: AuditContext) {
    const transaction = await this.productsRepository.getTransaction(tenantId);

    try {
      // Validate all IDs exist
      const ids = dto.items.map((item) => item.id);
      const existingIds = await this.productsRepository.findExistingByIds(
        tenantId,
        ids,
        transaction,
      );
      const existingIdSet = new Set(existingIds);
      const missingIds = ids.filter((id) => !existingIdSet.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
      }

      const results: { index: number; id: string; status: string }[] = [];

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
        const replacements: Record<string, unknown> = {
          updatedBy: auditContext.userId ?? null,
        };

        if (item.nameEn !== undefined) {
          updates.push('"nameEn" = :nameEn');
          replacements.nameEn = item.nameEn;
        }
        if (item.nameAr !== undefined) {
          updates.push('"nameAr" = :nameAr');
          replacements.nameAr = item.nameAr;
        }
        if (item.descriptionEn !== undefined) {
          updates.push('"descriptionEn" = :descriptionEn');
          replacements.descriptionEn = item.descriptionEn;
        }
        if (item.descriptionAr !== undefined) {
          updates.push('"descriptionAr" = :descriptionAr');
          replacements.descriptionAr = item.descriptionAr;
        }
        if (item.categoryId !== undefined) {
          updates.push('"categoryId" = :categoryId');
          replacements.categoryId = item.categoryId;
        }
        if (item.unitPrice !== undefined) {
          updates.push('"unitPrice" = :unitPrice');
          replacements.unitPrice = item.unitPrice;
        }
        if (item.costPrice !== undefined) {
          updates.push('"costPrice" = :costPrice');
          replacements.costPrice = item.costPrice;
        }
        if (item.taxRate !== undefined) {
          updates.push('"taxRate" = :taxRate');
          replacements.taxRate = item.taxRate;
        }
        if (item.barcode !== undefined) {
          updates.push('barcode = :barcode');
          replacements.barcode = item.barcode;
        }
        if (item.unit !== undefined) {
          updates.push('"unitOfMeasure" = :unitOfMeasure');
          replacements.unitOfMeasure = item.unit;
        }
        if (item.minStockLevel !== undefined) {
          updates.push('"reorderPoint" = :reorderPoint');
          replacements.reorderPoint = item.minStockLevel;
        }
        if (item.maxStockLevel !== undefined) {
          // maxStockLevel is tracked via minStockLevel/reorderPoint in entity
          // no direct column, skip or store in metadata
        }
        if (item.isActive !== undefined) {
          updates.push('"isActive" = :isActive');
          replacements.isActive = item.isActive;
        }

        await this.productsRepository.update(tenantId, item.id, updates, replacements, transaction);
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

  async bulkDelete(tenantId: string, dto: BulkDeleteProductsDto, auditContext: AuditContext) {
    const results: { index: number; id: string; status: string; error?: string }[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < dto.ids.length; i++) {
      const id = dto.ids[i];
      try {
        const product = await this.productsRepository.findById(tenantId, id);
        if (!product) {
          results.push({ index: i, id, status: 'failed', error: 'Product not found' });
          failed++;
          continue;
        }
        await this.productsRepository.softDelete(tenantId, id, auditContext.userId ?? null);
        results.push({ index: i, id, status: 'deleted' });
        succeeded++;
      } catch (error: any) {
        results.push({ index: i, id, status: 'failed', error: error.message });
        failed++;
      }
    }

    return { succeeded, failed, results };
  }

  /**
   * Update product cost price using weighted average formula.
   * Used when receiving new inventory at a different unit price.
   */
  async updateCostPrice(
    tenantId: string,
    productId: string,
    receivedQty: number,
    unitPrice: number,
    transaction?: Transaction,
  ) {
    const product = await this.productsRepository.findById(tenantId, productId);
    if (!product) throw new NotFoundException('Product not found');

    const stockLevel = await this.stockLevelsRepository.findAvailability(tenantId, productId);
    const currentQty = parseFloat(stockLevel?.quantity ?? '0');
    const currentCost = parseFloat(product.costPrice ?? '0');

    const totalQty = currentQty + receivedQty;
    if (totalQty === 0) return;

    const newCost = (currentQty * currentCost + receivedQty * unitPrice) / totalQty;
    const roundedCost = Math.round(newCost * 100) / 100;

    await this.productsRepository.update(
      tenantId,
      productId,
      ['"costPrice" = :costPrice', '"updatedAt" = NOW()'],
      { costPrice: roundedCost },
      transaction,
    );
  }
}
