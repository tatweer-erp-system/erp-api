import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { VendorsRepository } from '@/database/sql/repositories/vendors.repository';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { UpdateVendorRatingDto } from '../dto/update-vendor-rating.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly vendorsRepository: VendorsRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.vendorsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'ASC',
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
    const vendor = await this.vendorsRepository.findOneById(tenantId, id);
    if (!vendor) {
      throw new BadRequestException(msg(ErrorMessages.VENDOR_NOT_FOUND, id));
    }
    return vendor;
  }

  async create(tenantId: string, dto: CreateVendorDto, auditContext: AuditContext) {
    if (dto.email) {
      const exists = await this.vendorsRepository.existsByEmailTenant(tenantId, dto.email);
      if (exists) {
        throw new ConflictException('A vendor with this email already exists');
      }
    }

    const id = await this.vendorsRepository.insertVendor(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      email: dto.email || null,
      phone: dto.phone || null,
      address: dto.address || null,
      taxNumber: dto.taxNumber || null,
      vatNumber: dto.vatNumber || null,
      crNumber: dto.crNumber || null,
      currencyId: dto.currencyId || null,
      paymentTermsDays: dto.paymentTermsDays ?? 30,
      bankName: dto.bankName || null,
      bankIban: dto.bankIban || null,
      notes: dto.notes || null,
      createdBy: auditContext.userId || null,
    });

    const vendor = await this.vendorsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'purchasing.vendors',
      id,
      vendor,
      auditContext.userId,
    );

    return vendor;
  }

  async update(tenantId: string, id: string, dto: UpdateVendorDto, auditContext: AuditContext) {
    const existing = await this.vendorsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.VENDOR_NOT_FOUND, id));
    }
    const before = { ...existing };

    if (dto.email && dto.email !== existing.email) {
      const exists = await this.vendorsRepository.existsByEmailTenant(tenantId, dto.email, id);
      if (exists) {
        throw new ConflictException('A vendor with this email already exists');
      }
    }

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
    if (dto.address !== undefined) {
      updates.push('address = :address');
      replacements.address = dto.address;
    }
    if (dto.taxNumber !== undefined) {
      updates.push('"taxNumber" = :taxNumber');
      replacements.taxNumber = dto.taxNumber;
    }
    if (dto.vatNumber !== undefined) {
      updates.push('"vatNumber" = :vatNumber');
      replacements.vatNumber = dto.vatNumber;
    }
    if (dto.crNumber !== undefined) {
      updates.push('"crNumber" = :crNumber');
      replacements.crNumber = dto.crNumber;
    }
    if (dto.currencyId !== undefined) {
      updates.push('"currencyId" = :currencyId');
      replacements.currencyId = dto.currencyId;
    }
    if (dto.paymentTermsDays !== undefined) {
      updates.push('"paymentTermsDays" = :paymentTermsDays');
      replacements.paymentTermsDays = dto.paymentTermsDays;
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

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId || null;
    updates.push('"updatedAt" = NOW()');

    await this.vendorsRepository.updateVendor(tenantId, id, updates, replacements);

    const updated = await this.vendorsRepository.findOneById(tenantId, id);

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

  async updateRating(
    tenantId: string,
    id: string,
    dto: UpdateVendorRatingDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.vendorsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.VENDOR_NOT_FOUND, id));
    }
    const before = { ...existing };

    await this.vendorsRepository.updateVendor(
      tenantId,
      id,
      ['rating = :rating', '"updatedBy" = :updatedBy', '"updatedAt" = NOW()'],
      { id, rating: dto.rating, updatedBy: auditContext.userId || null },
    );

    const updated = await this.vendorsRepository.findOneById(tenantId, id);

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

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.vendorsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.VENDOR_NOT_FOUND, id));
    }

    await this.vendorsRepository.softDeleteVendor(tenantId, id, auditContext.userId || null);

    await this.auditService.logDelete(
      tenantId,
      'purchasing.vendors',
      id,
      existing,
      auditContext.userId,
    );
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const rows = await this.vendorsRepository.findDropdown(tenantId, {
      search: query.search,
      limit: query.limit || 100,
    });

    return rows;
  }
}
