import { Injectable, NotFoundException } from '@nestjs/common';
import { PricelistsRepository } from '@/database/sql/repositories/pricelists.repository';
import { CreatePricelistDto } from '../dto/create-pricelist.dto';
import { UpdatePricelistDto } from '../dto/update-pricelist.dto';
import { CreatePricelistItemDto } from '../dto/create-pricelist-item.dto';
import { UpdatePricelistItemDto } from '../dto/update-pricelist-item.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

@Injectable()
export class PricelistsService {
  constructor(private readonly pricelistsRepository: PricelistsRepository) {}

  // ── Pricelists ──────────────────────────────────────────────────────────────

  async findAll(tenantId: string, pagination: PaginationDto & { isActive?: boolean }) {
    const { limit = 20, search, page = 1, isActive } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.pricelistsRepository.findAll(tenantId, {
      limit,
      offset,
      search,
      isActive,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const pricelist = await this.pricelistsRepository.findById(tenantId, id);
    if (!pricelist) throw new NotFoundException(msg(ErrorMessages.PRICELIST_NOT_FOUND, id));
    return pricelist;
  }

  async findByIdWithItems(tenantId: string, id: string) {
    const pricelist = await this.findById(tenantId, id);
    const items = await this.pricelistsRepository.findItemsByPricelistId(tenantId, id);
    return { ...pricelist, items };
  }

  async create(tenantId: string, dto: CreatePricelistDto, auditContext: AuditContext) {
    const createdPL: any = await this.pricelistsRepository.create({
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      currencyId: dto.currencyId ?? null,
      discountPolicy: dto.discountPolicy,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      isActive: dto.isActive ?? true,
      createdBy: auditContext.userId ?? null,
    } as any);
    const id = typeof createdPL === 'string' ? createdPL : createdPL.id;
    return this.findByIdWithItems(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdatePricelistDto, auditContext: AuditContext) {
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
    if (dto.currencyId !== undefined) {
      updates.push('"currencyId" = :currencyId');
      replacements.currencyId = dto.currencyId;
    }
    if (dto.discountPolicy !== undefined) {
      updates.push('"discountPolicy" = :discountPolicy');
      replacements.discountPolicy = dto.discountPolicy;
    }
    if (dto.startDate !== undefined) {
      updates.push('"startDate" = :startDate');
      replacements.startDate = dto.startDate ?? null;
    }
    if (dto.endDate !== undefined) {
      updates.push('"endDate" = :endDate');
      replacements.endDate = dto.endDate ?? null;
    }
    if (dto.isActive !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isActive;
    }

    await (this.pricelistsRepository as any).update(tenantId, id, updates, replacements);
    return this.findByIdWithItems(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantId, id);
    await this.pricelistsRepository.softDeleteAllItems(tenantId, id, auditContext.userId ?? null);
    await this.pricelistsRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.pricelistsRepository.findForDropdown(tenantId, { search, limit });
  }

  // ── Pricelist Items ─────────────────────────────────────────────────────────

  async findItemById(tenantId: string, itemId: string) {
    const item = await this.pricelistsRepository.findItemById(tenantId, itemId);
    if (!item) throw new NotFoundException(msg(ErrorMessages.PRICELIST_ITEM_NOT_FOUND, itemId));
    return item;
  }

  async addItem(
    tenantId: string,
    pricelistId: string,
    dto: CreatePricelistItemDto,
    auditContext: AuditContext,
  ) {
    await this.findById(tenantId, pricelistId);

    const createdItem: any = await this.pricelistsRepository.createItem({
      pricelistId,
      applyOn: dto.applyOn,
      productId: dto.productId ?? null,
      categoryId: dto.categoryId ?? null,
      minQty: dto.minQty ?? 0,
      computationType: dto.computationType,
      fixedPrice: dto.fixedPrice ?? null,
      percentDiscount: dto.percentDiscount ?? null,
      formulaPriceBasis: dto.formulaPriceBasis ?? null,
      formulaDiscount: dto.formulaDiscount ?? null,
      dateStart: dto.dateStart ?? null,
      dateEnd: dto.dateEnd ?? null,
      createdBy: auditContext.userId ?? null,
    } as any);
    const id = typeof createdItem === 'string' ? createdItem : createdItem.id;
    return this.findItemById(tenantId, id);
  }

  async updateItem(
    tenantId: string,
    pricelistId: string,
    itemId: string,
    dto: UpdatePricelistItemDto,
    auditContext: AuditContext,
  ) {
    await this.findById(tenantId, pricelistId);
    await this.findItemById(tenantId, itemId);

    const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
    const replacements: Record<string, unknown> = { updatedBy: auditContext.userId ?? null };

    if (dto.applyOn !== undefined) {
      updates.push('"applyOn" = :applyOn');
      replacements.applyOn = dto.applyOn;
    }
    if (dto.productId !== undefined) {
      updates.push('"productId" = :productId');
      replacements.productId = dto.productId ?? null;
    }
    if (dto.categoryId !== undefined) {
      updates.push('"categoryId" = :categoryId');
      replacements.categoryId = dto.categoryId ?? null;
    }
    if (dto.minQty !== undefined) {
      updates.push('"minQty" = :minQty');
      replacements.minQty = dto.minQty;
    }
    if (dto.computationType !== undefined) {
      updates.push('"computationType" = :computationType');
      replacements.computationType = dto.computationType;
    }
    if (dto.fixedPrice !== undefined) {
      updates.push('"fixedPrice" = :fixedPrice');
      replacements.fixedPrice = dto.fixedPrice ?? null;
    }
    if (dto.percentDiscount !== undefined) {
      updates.push('"percentDiscount" = :percentDiscount');
      replacements.percentDiscount = dto.percentDiscount ?? null;
    }
    if (dto.formulaPriceBasis !== undefined) {
      updates.push('"formulaPriceBasis" = :formulaPriceBasis');
      replacements.formulaPriceBasis = dto.formulaPriceBasis ?? null;
    }
    if (dto.formulaDiscount !== undefined) {
      updates.push('"formulaDiscount" = :formulaDiscount');
      replacements.formulaDiscount = dto.formulaDiscount ?? null;
    }
    if (dto.dateStart !== undefined) {
      updates.push('"dateStart" = :dateStart');
      replacements.dateStart = dto.dateStart ?? null;
    }
    if (dto.dateEnd !== undefined) {
      updates.push('"dateEnd" = :dateEnd');
      replacements.dateEnd = dto.dateEnd ?? null;
    }

    await (this.pricelistsRepository as any).updateItem(tenantId, itemId, updates, replacements);
    return this.findItemById(tenantId, itemId);
  }

  async removeItem(
    tenantId: string,
    pricelistId: string,
    itemId: string,
    auditContext: AuditContext,
  ): Promise<void> {
    await this.findById(tenantId, pricelistId);
    await this.findItemById(tenantId, itemId);
    await this.pricelistsRepository.softDeleteItem(tenantId, itemId, auditContext.userId ?? null);
  }
}
