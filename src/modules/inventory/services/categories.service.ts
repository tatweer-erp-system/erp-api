import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';

@Injectable()
export class CategoriesService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM product_categories WHERE deleted_at IS NULL ${whereClause} ORDER BY name->>'en' LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM product_categories WHERE deleted_at IS NULL ${whereClause}`,
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
      `SELECT * FROM product_categories WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const category = (rows as any[])[0];
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(tenantSlug: string, dto: CreateCategoryDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();

    if (dto.parentId) {
      await this.findById(tenantSlug, dto.parentId);
    }

    await sequelize.query(
      `INSERT INTO product_categories (id, name, description, parent_id, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :description, :parentId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          name: JSON.stringify({ en: dto.name_en, ar: dto.name_ar }),
          description:
            dto.description_en || dto.description_ar
              ? JSON.stringify({ en: dto.description_en ?? '', ar: dto.description_ar ?? '' })
              : null,
          parentId: dto.parentId ?? null,
          createdBy: auditContext.userId ?? null,
        },
      } as any,
    );
    return this.findById(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateCategoryDto, auditContext: AuditContext) {
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
      updates.push('description = :description');
      replacements.description = JSON.stringify({
        en: dto.description_en ?? '',
        ar: dto.description_ar ?? '',
      });
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        await this.findById(tenantSlug, dto.parentId);
      }
      updates.push('parent_id = :parentId');
      replacements.parentId = dto.parentId ?? null;
    }

    await sequelize.query(`UPDATE product_categories SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE product_categories SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { search, limit = 50 } = query;
    const whereClause = search
      ? `AND (name->>'en' ILIKE :search OR name->>'ar' ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, name, parent_id FROM product_categories WHERE deleted_at IS NULL ${whereClause} ORDER BY name->>'en' LIMIT :limit`,
      {
        replacements: { limit, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );
    return rows;
  }
}
