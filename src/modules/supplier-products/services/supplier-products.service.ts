import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierProductsRepository } from '@/database/sql/repositories/supplier-products.repository';
import { CreateSupplierProductDto } from '../dto/create-supplier-product.dto';
import { UpdateSupplierProductDto } from '../dto/update-supplier-product.dto';
import { SupplierProductFilterDto } from '../dto/supplier-product-filter.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';

@Injectable()
export class SupplierProductsService {
  constructor(
    private readonly supplierProductsRepository: SupplierProductsRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantId: string, query: SupplierProductFilterDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.supplierProductsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      productId: query.productId,
      partnerId: query.partnerId,
      sortOrder: query.sortOrder || 'ASC',
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const record = await this.supplierProductsRepository.findOneById(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Supplier product with id ${id} not found`);
    }
    return record;
  }

  async create(tenantId: string, dto: CreateSupplierProductDto, auditContext: AuditContext) {
    const exists = await this.supplierProductsRepository.existsByUnique(
      tenantId,
      dto.productId,
      dto.partnerId,
    );
    if (exists) {
      throw new ConflictException(
        `A supplier product already exists for product=${dto.productId} partner=${dto.partnerId}`,
      );
    }

    const id = await this.supplierProductsRepository.insertSupplierProduct(tenantId, {
      productId: dto.productId,
      partnerId: dto.partnerId,
      minQty: dto.minQty,
      price: dto.price,
      currencyId: dto.currencyId ?? null,
      leadTimeDays: dto.leadTimeDays,
      sequence: dto.sequence,
      createdBy: auditContext.userId ?? null,
    });

    const record = await this.supplierProductsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'purchasing.supplier_products',
      id,
      record,
      auditContext.userId,
    );

    return record;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSupplierProductDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.findById(tenantId, id);
    const before = { ...existing };

    // Check uniqueness if productId or partnerId changed
    if (dto.productId !== undefined || dto.partnerId !== undefined) {
      const productId = dto.productId ?? existing.productId;
      const partnerId = dto.partnerId ?? existing.partnerId;
      const duplicate = await this.supplierProductsRepository.existsByUnique(
        tenantId,
        productId,
        partnerId,
        id,
      );
      if (duplicate) {
        throw new ConflictException(
          `A supplier product already exists for product=${productId} partner=${partnerId}`,
        );
      }
    }

    const updates: string[] = [];
    const replacements: Record<string, unknown> = { id };

    if (dto.productId !== undefined) {
      updates.push('"productId" = :productId');
      replacements.productId = dto.productId;
    }
    if (dto.partnerId !== undefined) {
      updates.push('"partnerId" = :partnerId');
      replacements.partnerId = dto.partnerId;
    }
    if (dto.minQty !== undefined) {
      updates.push('"minQty" = :minQty');
      replacements.minQty = dto.minQty;
    }
    if (dto.price !== undefined) {
      updates.push('price = :price');
      replacements.price = dto.price;
    }
    if (dto.currencyId !== undefined) {
      updates.push('"currencyId" = :currencyId');
      replacements.currencyId = dto.currencyId;
    }
    if (dto.leadTimeDays !== undefined) {
      updates.push('"leadTimeDays" = :leadTimeDays');
      replacements.leadTimeDays = dto.leadTimeDays;
    }
    if (dto.sequence !== undefined) {
      updates.push('sequence = :sequence');
      replacements.sequence = dto.sequence;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId ?? null;
    updates.push('"updatedAt" = NOW()');

    await this.supplierProductsRepository.updateSupplierProduct(
      tenantId,
      id,
      updates,
      replacements,
    );

    const updated = await this.supplierProductsRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'purchasing.supplier_products',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.findById(tenantId, id);
    await this.supplierProductsRepository.softDeleteSupplierProduct(
      tenantId,
      id,
      auditContext.userId ?? null,
    );

    await this.auditService.logDelete(
      tenantId,
      'purchasing.supplier_products',
      id,
      existing,
      auditContext.userId,
    );
  }
}
