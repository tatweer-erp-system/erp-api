import { Injectable, ConflictException } from '@nestjs/common';
import { BranchesRepository } from '@/database/sql/repositories/branches.repository';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class TenantBranchesService {
  constructor(private readonly branchesRepository: BranchesRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.branchesRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr', 'code'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    return this.branchesRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateBranchDto, auditContext?: AuditContext) {
    const codeExists = await this.branchesRepository.existsByCode(dto.code, tenantId);
    if (codeExists) {
      throw new ConflictException(`Branch code '${dto.code}' already exists for this tenant`);
    }

    return this.branchesRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        code: dto.code,
        isMain: dto.isMain ?? false,
        isActive: dto.isActive ?? true,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto, auditContext?: AuditContext) {
    if (dto.code !== undefined) {
      const codeExists = await this.branchesRepository.existsByCode(dto.code, tenantId, id);
      if (codeExists) {
        throw new ConflictException(`Branch code '${dto.code}' already exists for this tenant`);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) updateData.descriptionAr = dto.descriptionAr;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.isMain !== undefined) updateData.isMain = dto.isMain;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    return this.branchesRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async toggleStatus(tenantId: string, id: string, isActive: boolean, auditContext?: AuditContext) {
    return this.branchesRepository.update(id, { isActive } as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext?: AuditContext) {
    await this.branchesRepository.softDelete(id, { tenantId, auditContext });
  }
}
