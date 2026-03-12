import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from '@/database/sql/repositories/categories.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.categoriesRepository.findAll(tenantId, {
      limit,
      offset,
      search,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const category = await this.categoriesRepository.findById(tenantId, id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(tenantId: string, dto: CreateCategoryDto, auditContext: AuditContext) {
    if (dto.parentId) {
      await this.findById(tenantId, dto.parentId);
    }

    const id = await this.categoriesRepository.create(tenantId, {
      name: JSON.stringify({ en: dto.name_en, ar: dto.name_ar }),
      description:
        dto.description_en || dto.description_ar
          ? JSON.stringify({ en: dto.description_en ?? '', ar: dto.description_ar ?? '' })
          : null,
      parentId: dto.parentId ?? null,
      createdBy: auditContext.userId ?? null,
    });
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = {
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
        await this.findById(tenantId, dto.parentId);
      }
      updates.push('parent_id = :parentId');
      replacements.parentId = dto.parentId ?? null;
    }

    await this.categoriesRepository.update(tenantId, id, updates, replacements);

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantId, id);
    await this.categoriesRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.categoriesRepository.findForDropdown(tenantId, { search, limit });
  }
}
