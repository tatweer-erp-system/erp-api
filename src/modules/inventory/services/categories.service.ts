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
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionAr: dto.descriptionAr ?? null,
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
