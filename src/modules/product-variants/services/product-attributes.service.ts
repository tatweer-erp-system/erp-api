import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductAttributesRepository } from '@/database/sql/repositories/product-attributes.repository';
import { ProductAttributeValuesRepository } from '@/database/sql/repositories/product-attribute-values.repository';
import { CreateProductAttributeDto } from '../dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from '../dto/update-product-attribute.dto';
import { CreateAttributeValueDto } from '../dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from '../dto/update-attribute-value.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AttributeDisplayType } from '@/common/enums/product-variant.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class ProductAttributesService {
  constructor(
    private readonly productAttributesRepository: ProductAttributesRepository,
    private readonly productAttributeValuesRepository: ProductAttributeValuesRepository,
  ) {}

  // ── Attributes ────────────────────────────────────────────────────────────

  async findAllAttributes(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1 } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.productAttributesRepository.findAll(tenantId, {
      limit,
      offset,
      search,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAttributeById(tenantId: string, id: string) {
    const attribute = await this.productAttributesRepository.findByIdWithValues(tenantId, id);
    if (!attribute) throw new NotFoundException(msg(ErrorMessages.PRODUCT_ATTRIBUTE_NOT_FOUND, id));
    return attribute;
  }

  async createAttribute(
    tenantId: string,
    dto: CreateProductAttributeDto,
    auditContext: AuditContext,
  ) {
    const id = await this.productAttributesRepository.create(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      displayType: dto.displayType ?? AttributeDisplayType.SELECT,
      sequence: dto.sequence ?? 0,
      createdBy: auditContext.userId ?? null,
    });
    return this.findAttributeById(tenantId, id);
  }

  async updateAttribute(
    tenantId: string,
    id: string,
    dto: UpdateProductAttributeDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.productAttributesRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException(msg(ErrorMessages.PRODUCT_ATTRIBUTE_NOT_FOUND, id));
    if (existing.version !== dto.version) {
      throw new ConflictException(msg(ErrorMessages.ORDER_VERSION_CONFLICT));
    }

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = { updatedBy: auditContext.userId ?? null };

    if (dto.nameEn !== undefined) {
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }
    if (dto.displayType !== undefined) {
      updates.push('"displayType" = :displayType');
      replacements.displayType = dto.displayType;
    }
    if (dto.sequence !== undefined) {
      updates.push('sequence = :sequence');
      replacements.sequence = dto.sequence;
    }

    await this.productAttributesRepository.update(tenantId, id, updates, replacements);
    return this.findAttributeById(tenantId, id);
  }

  async removeAttribute(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    const existing = await this.productAttributesRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException(msg(ErrorMessages.PRODUCT_ATTRIBUTE_NOT_FOUND, id));
    await this.productAttributesRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  async getAttributeDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.productAttributesRepository.findForDropdown(tenantId, { search, limit });
  }

  // ── Attribute Values ──────────────────────────────────────────────────────

  async findAttributeValues(tenantId: string, attributeId: string, pagination: PaginationDto) {
    // Verify attribute exists
    const attribute = await this.productAttributesRepository.findById(tenantId, attributeId);
    if (!attribute)
      throw new NotFoundException(msg(ErrorMessages.PRODUCT_ATTRIBUTE_NOT_FOUND, attributeId));

    const { limit = 20, search, page = 1 } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.productAttributeValuesRepository.findAllByAttribute(
      tenantId,
      attributeId,
      { limit, offset, search },
    );

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAttributeValue(
    tenantId: string,
    attributeId: string,
    dto: CreateAttributeValueDto,
    auditContext: AuditContext,
  ) {
    const attribute = await this.productAttributesRepository.findById(tenantId, attributeId);
    if (!attribute)
      throw new NotFoundException(msg(ErrorMessages.PRODUCT_ATTRIBUTE_NOT_FOUND, attributeId));

    const id = await this.productAttributeValuesRepository.create(tenantId, {
      attributeId,
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      htmlColor: dto.htmlColor ?? null,
      sequence: dto.sequence ?? 0,
      createdBy: auditContext.userId ?? null,
    });

    return this.productAttributeValuesRepository.findById(tenantId, id);
  }

  async updateAttributeValue(
    tenantId: string,
    id: string,
    dto: UpdateAttributeValueDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.productAttributeValuesRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException(msg(ErrorMessages.ATTRIBUTE_VALUE_NOT_FOUND, id));
    if (existing.version !== dto.version) {
      throw new ConflictException(msg(ErrorMessages.ORDER_VERSION_CONFLICT));
    }

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = { updatedBy: auditContext.userId ?? null };

    if (dto.nameEn !== undefined) {
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }
    if (dto.htmlColor !== undefined) {
      updates.push('"htmlColor" = :htmlColor');
      replacements.htmlColor = dto.htmlColor;
    }
    if (dto.sequence !== undefined) {
      updates.push('sequence = :sequence');
      replacements.sequence = dto.sequence;
    }

    await this.productAttributeValuesRepository.update(tenantId, id, updates, replacements);
    return this.productAttributeValuesRepository.findById(tenantId, id);
  }

  async removeAttributeValue(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
  ): Promise<void> {
    const existing = await this.productAttributeValuesRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException(msg(ErrorMessages.ATTRIBUTE_VALUE_NOT_FOUND, id));
    await this.productAttributeValuesRepository.softDelete(
      tenantId,
      id,
      auditContext.userId ?? null,
    );
  }
}
