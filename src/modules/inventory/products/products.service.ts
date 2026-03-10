import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0, search } = pagination;
    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search OR sku ILIKE :search)`
      : '';
    const [rows] = await sequelize.query(
      `SELECT * FROM products WHERE deleted_at IS NULL ${whereClause} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
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
      meta: {
        page: pagination.page ?? 1,
        limit,
        total,
        totalPages: Math.ceil(total / (limit as number)),
      },
    };
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM products WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const product = (rows as any[])[0];
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(tenantSlug: string, dto: CreateProductDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO products (id, name, description, sku, barcode, category_id, unit_price, cost_price,
       currency, unit_of_measure, reorder_point, is_active, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :description, :sku, :barcode, :categoryId, :unitPrice, :costPrice,
       :currency, :unitOfMeasure, :reorderPoint, true, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          name: JSON.stringify(dto.name),
          description: dto.description ? JSON.stringify(dto.description) : null,
          sku: dto.sku ?? null,
          barcode: dto.barcode ?? null,
          categoryId: dto.categoryId ?? null,
          unitPrice: dto.unitPrice,
          costPrice: dto.costPrice ?? null,
          currency: dto.currency ?? 'USD',
          unitOfMeasure: dto.unitOfMeasure ?? 'pcs',
          reorderPoint: dto.reorderPoint ?? 0,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateProductDto, updatedBy?: string) {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const updates = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = { id, updatedBy: updatedBy ?? null };
    if (dto.name !== undefined) {
      updates.push('name = :name');
      replacements['name'] = JSON.stringify(dto.name);
    }
    if (dto.unitPrice !== undefined) {
      updates.push('unit_price = :unitPrice');
      replacements['unitPrice'] = dto.unitPrice;
    }
    if (dto.reorderPoint !== undefined) {
      updates.push('reorder_point = :reorderPoint');
      replacements['reorderPoint'] = dto.reorderPoint;
    }
    await sequelize.query(`UPDATE products SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);
    return this.findOne(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string): Promise<void> {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`UPDATE products SET deleted_at = NOW() WHERE id = :id`, {
      replacements: { id },
    } as any);
  }
}
