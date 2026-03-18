import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PricelistsRepository } from '@/database/sql/repositories/pricelists.repository';
import { PricelistItemsRepository } from '@/database/sql/repositories/pricelist-items.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { CreatePricelistDto } from '../dto/create-pricelist.dto';
import { UpdatePricelistDto } from '../dto/update-pricelist.dto';
import { CreatePricelistItemDto } from '../dto/create-pricelist-item.dto';
import { UpdatePricelistItemDto } from '../dto/update-pricelist-item.dto';
import { ComputePriceQueryDto } from '../dto/compute-price-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { PricelistApplyOn, PricelistComputation } from '@/common/enums/pricelist.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class PricelistsService {
  constructor(
    private readonly pricelistsRepository: PricelistsRepository,
    private readonly pricelistItemsRepository: PricelistItemsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  // ── Pricelist CRUD ──────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: PaginationDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.pricelistsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'ASC',
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSummary(tenantId: string) {
    return this.pricelistsRepository.getSummary(tenantId);
  }

  async findById(tenantId: string, id: string) {
    const pricelist = await this.pricelistsRepository.findOneById(tenantId, id);
    if (!pricelist) {
      throw new NotFoundException(`Pricelist with id ${id} not found`);
    }
    return pricelist;
  }

  async create(tenantId: string, dto: CreatePricelistDto, auditContext: AuditContext) {
    const id = await this.pricelistsRepository.insertPricelist(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      currencyId: dto.currencyId ?? null,
      discountPolicy: dto.discountPolicy,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      isActive: dto.isActive,
      createdBy: auditContext.userId ?? null,
    });

    const pricelist = await this.pricelistsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'sales.pricelists',
      id,
      pricelist,
      auditContext.userId,
    );

    return pricelist;
  }

  async update(tenantId: string, id: string, dto: UpdatePricelistDto, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);
    const before = { ...existing };

    const updates: string[] = [];
    const replacements: Record<string, unknown> = { id };

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
      replacements.startDate = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      updates.push('"endDate" = :endDate');
      replacements.endDate = dto.endDate;
    }
    if (dto.isActive !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isActive;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId ?? null;
    updates.push('"updatedAt" = NOW()');

    await this.pricelistsRepository.updatePricelist(tenantId, id, updates, replacements);

    const updated = await this.pricelistsRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'sales.pricelists',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);
    await this.pricelistsRepository.softDeletePricelist(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(
      tenantId,
      'sales.pricelists',
      id,
      existing,
      auditContext.userId,
    );
  }

  // ── Pricelist Items ─────────────────────────────────────────────────────────

  async getItems(tenantId: string, pricelistId: string) {
    await this.findById(tenantId, pricelistId);
    return this.pricelistItemsRepository.findByPricelistId(tenantId, pricelistId);
  }

  async createItem(
    tenantId: string,
    pricelistId: string,
    dto: CreatePricelistItemDto,
    auditContext: AuditContext,
  ) {
    await this.findById(tenantId, pricelistId);

    if (dto.applyOn === PricelistApplyOn.PRODUCT && !dto.productId) {
      throw new BadRequestException('productId is required when applyOn is set to product');
    }
    if (dto.applyOn === PricelistApplyOn.CATEGORY && !dto.categoryId) {
      throw new BadRequestException('categoryId is required when applyOn is set to category');
    }

    const id = await this.pricelistItemsRepository.insertItem(tenantId, {
      pricelistId,
      applyOn: dto.applyOn,
      productId: dto.productId ?? null,
      categoryId: dto.categoryId ?? null,
      minQty: dto.minQty,
      computation: dto.computation,
      price: dto.price ?? null,
      discountPct: dto.discountPct ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      sequence: dto.sequence,
      createdBy: auditContext.userId ?? null,
    });

    return this.pricelistItemsRepository.findOneById(tenantId, id);
  }

  async updateItem(
    tenantId: string,
    itemId: string,
    dto: UpdatePricelistItemDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.pricelistItemsRepository.findOneById(tenantId, itemId);
    if (!existing) {
      throw new NotFoundException(`Pricelist item with id ${itemId} not found`);
    }

    const updates: string[] = [];
    const replacements: Record<string, unknown> = { id: itemId };

    if (dto.applyOn !== undefined) {
      updates.push('"applyOn" = :applyOn');
      replacements.applyOn = dto.applyOn;
    }
    if (dto.productId !== undefined) {
      updates.push('"productId" = :productId');
      replacements.productId = dto.productId;
    }
    if (dto.categoryId !== undefined) {
      updates.push('"categoryId" = :categoryId');
      replacements.categoryId = dto.categoryId;
    }
    if (dto.minQty !== undefined) {
      updates.push('"minQty" = :minQty');
      replacements.minQty = dto.minQty;
    }
    if (dto.computation !== undefined) {
      updates.push('computation = :computation');
      replacements.computation = dto.computation;
    }
    if (dto.price !== undefined) {
      updates.push('price = :price');
      replacements.price = dto.price;
    }
    if (dto.discountPct !== undefined) {
      updates.push('"discountPct" = :discountPct');
      replacements.discountPct = dto.discountPct;
    }
    if (dto.startDate !== undefined) {
      updates.push('"startDate" = :startDate');
      replacements.startDate = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      updates.push('"endDate" = :endDate');
      replacements.endDate = dto.endDate;
    }
    if (dto.sequence !== undefined) {
      updates.push('sequence = :sequence');
      replacements.sequence = dto.sequence;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId ?? null;
    updates.push('"updatedAt" = NOW()');

    await this.pricelistItemsRepository.updateItem(tenantId, itemId, updates, replacements);
    return this.pricelistItemsRepository.findOneById(tenantId, itemId);
  }

  async removeItem(tenantId: string, itemId: string, auditContext: AuditContext) {
    const existing = await this.pricelistItemsRepository.findOneById(tenantId, itemId);
    if (!existing) {
      throw new NotFoundException(`Pricelist item with id ${itemId} not found`);
    }
    await this.pricelistItemsRepository.softDeleteItem(
      tenantId,
      itemId,
      auditContext.userId ?? null,
    );
  }

  // ── Compute Price ───────────────────────────────────────────────────────────

  async computePrice(tenantId: string, query: ComputePriceQueryDto) {
    const { pricelistId, productId, qty = 1 } = query;

    // Verify pricelist exists
    await this.findById(tenantId, pricelistId);

    // Get product to find its category and base price
    const product = await this.productsRepository.findById(tenantId, productId);
    if (!product) {
      throw new NotFoundException(msg(ErrorMessages.PRODUCT_NOT_FOUND, productId));
    }

    const today = new Date().toISOString().split('T')[0];
    const categoryId = product.categoryId ?? null;

    const matchingItem = await this.pricelistItemsRepository.findMatchingItems(
      tenantId,
      pricelistId,
      productId,
      categoryId,
      qty,
      today,
    );

    if (!matchingItem) {
      return {
        originalPrice: parseFloat(product.salePrice ?? product.price ?? '0'),
        computedPrice: parseFloat(product.salePrice ?? product.price ?? '0'),
        discount: 0,
        pricelistItemId: null,
      };
    }

    const originalPrice = parseFloat(product.salePrice ?? product.price ?? '0');
    let computedPrice = originalPrice;
    let discount = 0;

    const computation = matchingItem.computation as PricelistComputation;

    switch (computation) {
      case PricelistComputation.FIXED:
        computedPrice = parseFloat(matchingItem.price ?? '0');
        discount = originalPrice - computedPrice;
        break;

      case PricelistComputation.PERCENTAGE: {
        const pct = parseFloat(matchingItem.discountPct ?? '0');
        discount = Math.round(originalPrice * pct) / 100;
        computedPrice = originalPrice - discount;
        break;
      }

      case PricelistComputation.FORMULA: {
        // Formula: apply percentage discount, then use price as surcharge
        const formulaPct = parseFloat(matchingItem.discountPct ?? '0');
        const surcharge = parseFloat(matchingItem.price ?? '0');
        discount = Math.round(originalPrice * formulaPct) / 100;
        computedPrice = originalPrice - discount + surcharge;
        break;
      }
    }

    computedPrice = Math.round(computedPrice * 100) / 100;
    discount = Math.round(discount * 100) / 100;

    return {
      originalPrice,
      computedPrice: Math.max(0, computedPrice),
      discount: Math.max(0, discount),
      pricelistItemId: matchingItem.id,
    };
  }
}
