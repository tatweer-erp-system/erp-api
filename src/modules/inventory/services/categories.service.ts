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
      name: JSON.stringify({ en: dto.nameEn, ar: dto.nameAr }),
      description:
        dto.descriptionEn || dto.descriptionAr
          ? JSON.stringify({ en: dto.descriptionEn ?? '', ar: dto.descriptionAr ?? '' })
          : null,
      parentId: dto.parentId ?? null,
      createdBy: auditContext.userId ?? null,
    });
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);

    const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
    const replacements: Record<string, unknown> = {
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.nameEn !== undefined || dto.nameAr !== undefined) {
      const currentName =
        typeof existing.name === 'string' ? JSON.parse(existing.name) : existing.name;
      updates.push('name = :name');
      replacements.name = JSON.stringify({
        en: dto.nameEn ?? currentName?.en ?? '',
        ar: dto.nameAr ?? currentName?.ar ?? '',
      });
    }
    if (dto.descriptionEn !== undefined || dto.descriptionAr !== undefined) {
      updates.push('description = :description');
      replacements.description = JSON.stringify({
        en: dto.descriptionEn ?? '',
        ar: dto.descriptionAr ?? '',
      });
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        await this.findById(tenantId, dto.parentId);
      }
      updates.push('"parentId" = :parentId');
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
