import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CrmStagesRepository } from '@/database/sql/repositories/crm-stages.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateCrmStageDto } from '../dto/create-crm-stage.dto';
import { UpdateCrmStageDto } from '../dto/update-crm-stage.dto';

@Injectable()
export class CrmStagesService {
  private readonly logger = new Logger(CrmStagesService.name);

  constructor(private readonly crmStagesRepository: CrmStagesRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.crmStagesRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: 'sequence',
      sortOrder: 'ASC',
    });
  }

  async findById(tenantId: string, id: string) {
    const stage = await this.crmStagesRepository.findByIdOrNull(id, { tenantId });
    if (!stage) {
      throw new NotFoundException(msg(ErrorMessages.CRM_STAGE_NOT_FOUND, id));
    }
    return stage;
  }

  async create(tenantId: string, dto: CreateCrmStageDto, auditContext: AuditContext) {
    return this.crmStagesRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        sequence: dto.sequence,
        probability: dto.probability ?? 20,
        isWon: dto.isWon ?? false,
        isFolded: dto.isFolded ?? false,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateCrmStageDto, auditContext: AuditContext) {
    const stage = await this.crmStagesRepository.findByIdOrNull(id, { tenantId });
    if (!stage) {
      throw new NotFoundException(msg(ErrorMessages.CRM_STAGE_NOT_FOUND, id));
    }

    const updateData: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.sequence !== undefined) updateData.sequence = dto.sequence;
    if (dto.probability !== undefined) updateData.probability = dto.probability;
    if (dto.isWon !== undefined) updateData.isWon = dto.isWon;
    if (dto.isFolded !== undefined) updateData.isFolded = dto.isFolded;

    return this.crmStagesRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const stage = await this.crmStagesRepository.findByIdOrNull(id, { tenantId });
    if (!stage) {
      throw new NotFoundException(msg(ErrorMessages.CRM_STAGE_NOT_FOUND, id));
    }
    await this.crmStagesRepository.softDelete(id, { tenantId, auditContext });
  }
}
