import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { CostCentersRepository } from '@/database/sql/repositories/cost-centers.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';
import { UpdateCostCenterDto } from '../dto/update-cost-center.dto';

@Injectable()
export class CostCentersService {
  private readonly logger = new Logger(CostCentersService.name);

  constructor(private readonly costCentersRepository: CostCentersRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.costCentersRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['code'],
      sortBy: 'code',
      sortOrder: query.sortOrder ?? 'ASC',
    });
  }

  async findById(tenantId: string, id: string) {
    const cc = await this.costCentersRepository.findByIdOrNull(id, { tenantId });
    if (!cc) throw new NotFoundException(msg(ErrorMessages.COST_CENTER_NOT_FOUND, id));
    return cc;
  }

  async getTree(tenantId: string) {
    const flat = await this.costCentersRepository.getTree(tenantId);
    return this.buildTree(flat);
  }

  async create(tenantId: string, dto: CreateCostCenterDto, auditContext: AuditContext) {
    const existing = await this.costCentersRepository.existsByCode(tenantId, dto.code);
    if (existing) {
      throw new ConflictException(msg(ErrorMessages.COST_CENTER_CODE_DUPLICATE, dto.code));
    }

    return this.costCentersRepository.create(
      {
        code: dto.code,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        parentId: dto.parentId ?? null,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateCostCenterDto, auditContext: AuditContext) {
    const cc = await this.costCentersRepository.findByIdOrNull(id, { tenantId });
    if (!cc) throw new NotFoundException(msg(ErrorMessages.COST_CENTER_NOT_FOUND, id));

    const ccRecord = cc as unknown as Record<string, unknown>;

    if (dto.code && dto.code !== ccRecord.code) {
      const existing = await this.costCentersRepository.existsByCode(tenantId, dto.code);
      if (existing) {
        throw new ConflictException(msg(ErrorMessages.COST_CENTER_CODE_DUPLICATE, dto.code));
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) updateData.descriptionAr = dto.descriptionAr;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.costCentersRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const cc = await this.costCentersRepository.findByIdOrNull(id, { tenantId });
    if (!cc) throw new NotFoundException(msg(ErrorMessages.COST_CENTER_NOT_FOUND, id));
    await this.costCentersRepository.softDelete(id, { tenantId, auditContext });
  }

  private buildTree(
    flat: Record<string, unknown>[],
    parentId: string | null = null,
  ): Record<string, unknown>[] {
    return flat
      .filter((node) => (node.parentId ?? null) === parentId)
      .map((node) => ({
        ...node,
        children: this.buildTree(flat, node.id as string),
      }));
  }
}
