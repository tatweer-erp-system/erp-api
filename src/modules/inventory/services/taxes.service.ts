import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxesRepository } from '@/database/sql/repositories/taxes.repository';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { TaxScope } from '@/common/enums/inventory.enums';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

@Injectable()
export class TaxesService {
  constructor(private readonly taxesRepository: TaxesRepository) {}

  async findAll(
    tenantId: string,
    pagination: PaginationDto & { scope?: TaxScope; isActive?: boolean },
  ) {
    const { limit = 20, search, page = 1, scope, isActive } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.taxesRepository.findAll(
      tenantId,
      {
        limit,
        offset,
        search,
        scope,
        isActive,
      } as any,
      tenantId,
    );

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const tax = await this.taxesRepository.findById(tenantId, id);
    if (!tax) throw new NotFoundException(msg(ErrorMessages.TAX_NOT_FOUND, id));
    return tax;
  }

  async create(tenantId: string, dto: CreateTaxDto, auditContext: AuditContext) {
    const createdTax: any = await this.taxesRepository.create({
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      type: dto.type,
      scope: dto.scope,
      amount: dto.amount,
      includeInPrice: dto.includeInPrice ?? false,
      isActive: dto.isActive ?? true,
      createdBy: auditContext.userId ?? null,
    } as any);
    const id = typeof createdTax === 'string' ? createdTax : createdTax.id;
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateTaxDto, auditContext: AuditContext) {
    await this.findById(tenantId, id);

    const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
    const replacements: Record<string, unknown> = { updatedBy: auditContext.userId ?? null };

    if (dto.nameEn !== undefined) {
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }
    if (dto.type !== undefined) {
      updates.push('"type" = :type');
      replacements.type = dto.type;
    }
    if (dto.scope !== undefined) {
      updates.push('"scope" = :scope');
      replacements.scope = dto.scope;
    }
    if (dto.amount !== undefined) {
      updates.push('"amount" = :amount');
      replacements.amount = dto.amount;
    }
    if (dto.includeInPrice !== undefined) {
      updates.push('"includeInPrice" = :includeInPrice');
      replacements.includeInPrice = dto.includeInPrice;
    }
    if (dto.isActive !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isActive;
    }

    await (this.taxesRepository as any).update(tenantId, id, updates, replacements);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantId, id);
    await this.taxesRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto & { scope?: TaxScope }) {
    const { search, limit = 50, scope } = query;
    return this.taxesRepository.findForDropdown(tenantId, { search, limit, scope });
  }
}
