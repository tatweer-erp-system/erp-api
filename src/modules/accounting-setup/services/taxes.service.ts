import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxesRepository } from '@/database/sql/repositories/taxes.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { TaxType, TaxScope } from '@/common/enums/accounting-new.enums';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { FilterTaxDto } from '../dto/filter-tax.dto';

@Injectable()
export class TaxesService {
  constructor(private readonly taxesRepository: TaxesRepository) {}

  async findAll(tenantId: string, query: FilterTaxDto) {
    const where: Record<string, unknown> = {};
    if (query.scope) where.scope = query.scope;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.taxesRepository.findAll({
      tenantId,
      where,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'DESC',
    });
  }

  async findById(tenantId: string, id: string) {
    return this.taxesRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateTaxDto, auditContext: AuditContext) {
    return this.taxesRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        type: dto.type ?? TaxType.PERCENTAGE,
        amount: dto.amount ?? 15.0,
        scope: dto.scope ?? TaxScope.BOTH,
        includeInPrice: dto.includeInPrice ?? false,
        taxGroupId: dto.taxGroupId ?? null,
        saleAccountId: dto.saleAccountId ?? null,
        purchaseAccountId: dto.purchaseAccountId ?? null,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateTaxDto, auditContext: AuditContext) {
    const existing = await this.taxesRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.TAX_NOT_FOUND, id));

    const { version: _version, ...updateData } = dto;
    return this.taxesRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.taxesRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.TAX_NOT_FOUND, id));

    await this.taxesRepository.softDelete(id, { tenantId, auditContext });
  }
}
