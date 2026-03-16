import { BadRequestException, Injectable } from '@nestjs/common';
import { TransferReasonsRepository } from '@/database/sql/repositories/transfer-reasons.repository';
import { CreateTransferReasonDto } from '../dto/create-transfer-reason.dto';
import { UpdateTransferReasonDto } from '../dto/update-transfer-reason.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class TreasuryDefinitionsService {
  constructor(private readonly transferReasonsRepository: TransferReasonsRepository) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.transferReasonsRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const record = await this.transferReasonsRepository.findByIdOrNull(id, { tenantId });
    if (!record) {
      throw new BadRequestException(msg(ErrorMessages.TRANSFER_REASON_NOT_FOUND, id));
    }
    return record;
  }

  async create(tenantId: string, dto: CreateTransferReasonDto, auditContext: AuditContext) {
    return this.transferReasonsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTransferReasonDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.transferReasonsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.TRANSFER_REASON_NOT_FOUND, id));
    }

    return this.transferReasonsRepository.update(id, dto as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.transferReasonsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.TRANSFER_REASON_NOT_FOUND, id));
    }

    await this.transferReasonsRepository.softDelete(id, { tenantId, auditContext });
  }
}
