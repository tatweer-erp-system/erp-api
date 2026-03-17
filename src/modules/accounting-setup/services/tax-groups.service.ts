import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxGroupsRepository } from '@/database/sql/repositories/tax-groups.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateTaxGroupDto } from '../dto/create-tax-group.dto';
import { UpdateTaxGroupDto } from '../dto/update-tax-group.dto';

@Injectable()
export class TaxGroupsService {
  constructor(private readonly taxGroupsRepository: TaxGroupsRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.taxGroupsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'DESC',
    });
  }

  async findById(tenantId: string, id: string) {
    return this.taxGroupsRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateTaxGroupDto, auditContext: AuditContext) {
    return this.taxGroupsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateTaxGroupDto, auditContext: AuditContext) {
    const existing = await this.taxGroupsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.TAX_GROUP_NOT_FOUND, id));

    const { version: _version, ...updateData } = dto;
    return this.taxGroupsRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.taxGroupsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.TAX_GROUP_NOT_FOUND, id));

    await this.taxGroupsRepository.softDelete(id, { tenantId, auditContext });
  }
}
