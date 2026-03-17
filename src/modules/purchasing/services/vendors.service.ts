import { Injectable, Logger } from '@nestjs/common';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { UpdateVendorRatingDto } from '../dto/update-vendor-rating.dto';
import { PartnerType } from '@/common/enums/partner.enums';

/**
 * @deprecated This service is legacy. Use PartnersService with isSupplier=true filter instead.
 * Kept for backward compatibility — all methods delegate to partners table with isSupplier filter.
 */
@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly partnersRepository: PartnersRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.partnersRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'ASC',
      isSupplier: true,
    });

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantId: string, id: string) {
    const partner = await this.partnersRepository.findOneById(tenantId, id);
    if (!partner) {
      return null;
    }
    return partner;
  }

  /**
   * @deprecated Create via PartnersService instead.
   * Creates a partner with type=SUPPLIER and isSupplier=true.
   */
  async create(tenantId: string, dto: CreateVendorDto, auditContext: AuditContext) {
    const id = await this.partnersRepository.insertPartner(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      type: PartnerType.SUPPLIER,
      isCustomer: false,
      isSupplier: true,
      taxNumber: dto.taxNumber ?? null,
      vatNumber: dto.vatNumber ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      bankName: dto.bankName ?? null,
      bankIban: dto.bankIban ?? null,
      notes: dto.notes ?? null,
      createdBy: auditContext.userId ?? null,
    });

    const partner = await this.partnersRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'purchasing.vendors',
      id,
      partner,
      auditContext.userId,
    );

    return partner;
  }

  /**
   * @deprecated Update via PartnersService instead.
   */
  async update(tenantId: string, id: string, dto: UpdateVendorDto, auditContext: AuditContext) {
    const existing = await this.partnersRepository.findOneById(tenantId, id);
    if (!existing) {
      return null;
    }
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
    if (dto.email !== undefined) {
      updates.push('email = :email');
      replacements.email = dto.email;
    }
    if (dto.phone !== undefined) {
      updates.push('phone = :phone');
      replacements.phone = dto.phone;
    }
    if (dto.taxNumber !== undefined) {
      updates.push('"taxNumber" = :taxNumber');
      replacements.taxNumber = dto.taxNumber;
    }
    if (dto.vatNumber !== undefined) {
      updates.push('"vatNumber" = :vatNumber');
      replacements.vatNumber = dto.vatNumber;
    }
    if (dto.bankName !== undefined) {
      updates.push('"bankName" = :bankName');
      replacements.bankName = dto.bankName;
    }
    if (dto.bankIban !== undefined) {
      updates.push('"bankIban" = :bankIban');
      replacements.bankIban = dto.bankIban;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId ?? null;
    updates.push('"updatedAt" = NOW()');

    await this.partnersRepository.updatePartner(tenantId, id, updates, replacements);

    const updated = await this.partnersRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'purchasing.vendors',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  /**
   * @deprecated Use PartnersService instead.
   */
  async updateRating(
    _tenantId: string,
    _id: string,
    _dto: UpdateVendorRatingDto,
    _auditContext: AuditContext,
  ) {
    // Rating is not a standard field on partners — this is a no-op in the new schema.
    // If vendor ratings are needed, add a rating field to partners.
    this.logger.warn('VendorsService.updateRating is deprecated — no-op with partners schema');
    return this.partnersRepository.findOneById(_tenantId, _id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.partnersRepository.findOneById(tenantId, id);
    if (!existing) {
      return;
    }

    await this.partnersRepository.softDeletePartner(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(
      tenantId,
      'purchasing.vendors',
      id,
      existing,
      auditContext.userId,
    );
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    return this.partnersRepository.findDropdown(tenantId, {
      search: query.search,
      limit: query.limit || 100,
      type: PartnerType.SUPPLIER,
    });
  }
}
