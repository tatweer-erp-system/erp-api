import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ComboProductsRepository } from '@/database/sql/repositories/combo-products.repository';
import { ComboGroupsRepository } from '@/database/sql/repositories/combo-groups.repository';
import { ComboGroupItemsRepository } from '@/database/sql/repositories/combo-group-items.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { CreateComboProductDto } from '../dto/create-combo-product.dto';
import { CreateComboGroupDto } from '../dto/create-combo-group.dto';
import { UpdateComboGroupDto } from '../dto/update-combo-group.dto';
import { CreateComboGroupItemDto } from '../dto/create-combo-group-item.dto';
import { UpdateComboGroupItemDto } from '../dto/update-combo-group-item.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class ComboProductsService {
  constructor(
    private readonly comboProductsRepository: ComboProductsRepository,
    private readonly comboGroupsRepository: ComboGroupsRepository,
    private readonly comboGroupItemsRepository: ComboGroupItemsRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  // ── Combo Products ────────────────────────────────────────────────────────

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1 } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.comboProductsRepository.findAll(tenantId, {
      limit,
      offset,
      search,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const combo = await this.comboProductsRepository.findById(tenantId, id);
    if (!combo) throw new NotFoundException('Combo product not found');

    // Load groups with items
    const groups = await this.comboGroupsRepository.findByComboId(tenantId, id);
    for (const group of groups as any[]) {
      group.items = await this.comboGroupItemsRepository.findByGroupId(tenantId, group.id);
    }
    combo.groups = groups;

    return combo;
  }

  async create(tenantId: string, dto: CreateComboProductDto, auditContext: AuditContext) {
    const product = await this.productsRepository.findById(tenantId, dto.productId);
    if (!product) throw new NotFoundException(msg(ErrorMessages.PRODUCT_NOT_FOUND, dto.productId));

    const existingCombo = await this.comboProductsRepository.findByProductId(
      tenantId,
      dto.productId,
    );
    if (existingCombo) {
      throw new ConflictException(msg(ErrorMessages.COMBO_ALREADY_CONFIGURED, dto.productId));
    }

    const id = await this.comboProductsRepository.create(tenantId, {
      productId: dto.productId,
      createdBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    const combo = await this.comboProductsRepository.findById(tenantId, id);
    if (!combo) throw new NotFoundException('Combo product not found');
    await this.comboProductsRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  // ── Combo Groups ──────────────────────────────────────────────────────────

  async findGroupsByCombo(tenantId: string, comboId: string) {
    const combo = await this.comboProductsRepository.findById(tenantId, comboId);
    if (!combo) throw new NotFoundException('Combo product not found');

    const groups = await this.comboGroupsRepository.findByComboId(tenantId, comboId);
    for (const group of groups as any[]) {
      group.items = await this.comboGroupItemsRepository.findByGroupId(tenantId, group.id);
    }
    return groups;
  }

  async createGroup(tenantId: string, dto: CreateComboGroupDto, auditContext: AuditContext) {
    const combo = await this.comboProductsRepository.findById(tenantId, dto.comboId);
    if (!combo) throw new NotFoundException('Combo product not found');

    const id = await this.comboGroupsRepository.create(tenantId, {
      comboId: dto.comboId,
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      sequence: dto.sequence ?? 0,
      isRequired: dto.isRequired ?? true,
      createdBy: auditContext.userId ?? null,
    });

    return this.comboGroupsRepository.findById(tenantId, id);
  }

  async updateGroup(
    tenantId: string,
    id: string,
    dto: UpdateComboGroupDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.comboGroupsRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Combo group not found');
    if (existing.version !== dto.version) {
      throw new ConflictException('Version mismatch — please re-fetch and retry');
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
    if (dto.sequence !== undefined) {
      updates.push('sequence = :sequence');
      replacements.sequence = dto.sequence;
    }
    if (dto.isRequired !== undefined) {
      updates.push('"isRequired" = :isRequired');
      replacements.isRequired = dto.isRequired;
    }

    await this.comboGroupsRepository.update(tenantId, id, updates, replacements);
    return this.comboGroupsRepository.findById(tenantId, id);
  }

  async removeGroup(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    const existing = await this.comboGroupsRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Combo group not found');
    await this.comboGroupsRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }

  // ── Combo Group Items ─────────────────────────────────────────────────────

  async findItemsByGroup(tenantId: string, groupId: string) {
    const group = await this.comboGroupsRepository.findById(tenantId, groupId);
    if (!group) throw new NotFoundException('Combo group not found');
    return this.comboGroupItemsRepository.findByGroupId(tenantId, groupId);
  }

  async createItem(tenantId: string, dto: CreateComboGroupItemDto, auditContext: AuditContext) {
    const group = await this.comboGroupsRepository.findById(tenantId, dto.groupId);
    if (!group) throw new NotFoundException('Combo group not found');

    const product = await this.productsRepository.findById(tenantId, dto.productId);
    if (!product) throw new NotFoundException('Product not found');

    const id = await this.comboGroupItemsRepository.create(tenantId, {
      groupId: dto.groupId,
      productId: dto.productId,
      extraPrice: dto.extraPrice ?? 0,
      sequence: dto.sequence ?? 0,
      createdBy: auditContext.userId ?? null,
    });

    return this.comboGroupItemsRepository.findById(tenantId, id);
  }

  async updateItem(
    tenantId: string,
    id: string,
    dto: UpdateComboGroupItemDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.comboGroupItemsRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Combo group item not found');
    if (existing.version !== dto.version) {
      throw new ConflictException('Version mismatch — please re-fetch and retry');
    }

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = { updatedBy: auditContext.userId ?? null };

    if (dto.extraPrice !== undefined) {
      updates.push('"extraPrice" = :extraPrice');
      replacements.extraPrice = dto.extraPrice;
    }
    if (dto.sequence !== undefined) {
      updates.push('sequence = :sequence');
      replacements.sequence = dto.sequence;
    }

    await this.comboGroupItemsRepository.update(tenantId, id, updates, replacements);
    return this.comboGroupItemsRepository.findById(tenantId, id);
  }

  async removeItem(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    const existing = await this.comboGroupItemsRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Combo group item not found');
    await this.comboGroupItemsRepository.softDelete(tenantId, id, auditContext.userId ?? null);
  }
}
