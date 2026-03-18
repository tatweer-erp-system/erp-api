import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { CreatePartnerDto } from '../dto/create-partner.dto';
import { UpdatePartnerDto } from '../dto/update-partner.dto';
import { FilterPartnerDto } from '../dto/filter-partner.dto';
import { PartnerDropdownQueryDto } from '../dto/partner-dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { PartnerType } from '@/common/enums/partner.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly partnersRepository: PartnersRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantId: string, query: FilterPartnerDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.partnersRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'ASC',
      type: query.type,
      isCustomer: query.isCustomer,
      isSupplier: query.isSupplier,
      isActive: query.isActive,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
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

  async findOne(tenantId: string, id: string) {
    const partner = await this.partnersRepository.findOneWithContacts(tenantId, id);
    if (!partner) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_NOT_FOUND, id));
    }
    return partner;
  }

  async create(tenantId: string, dto: CreatePartnerDto, auditContext: AuditContext) {
    if (dto.email) {
      const exists = await this.partnersRepository.existsByEmailTenant(tenantId, dto.email);
      if (exists) {
        throw new ConflictException(msg(ErrorMessages.PARTNER_EMAIL_EXISTS, dto.email));
      }
    }

    const { isCustomer, isSupplier } = this.resolveCustomerSupplierFlags(dto.type);

    const id = await this.partnersRepository.insertPartner(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      type: dto.type,
      isCustomer,
      isSupplier,
      taxNumber: dto.taxNumber ?? null,
      vatNumber: dto.vatNumber ?? null,
      phone: dto.phone ?? null,
      mobile: dto.mobile ?? null,
      email: dto.email ?? null,
      website: dto.website ?? null,
      street: dto.street ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? 'Saudi Arabia',
      zip: dto.zip ?? null,
      creditLimit: dto.creditLimit ?? 0,
      paymentTermId: dto.paymentTermId ?? null,
      pricelistId: dto.pricelistId ?? null,
      arAccountId: dto.arAccountId ?? null,
      apAccountId: dto.apAccountId ?? null,
      fiscalPositionId: dto.fiscalPositionId ?? null,
      bankIban: dto.bankIban ?? null,
      bankName: dto.bankName ?? null,
      notes: dto.notes ?? null,
      createdBy: auditContext.userId ?? null,
    });

    const partner = await this.partnersRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'partners.partners',
      id,
      partner,
      auditContext.userId,
    );

    return partner;
  }

  async update(tenantId: string, id: string, dto: UpdatePartnerDto, auditContext: AuditContext) {
    const existing = await this.partnersRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_NOT_FOUND, id));
    }
    const before = { ...existing };

    if (dto.email && dto.email !== existing.email) {
      const exists = await this.partnersRepository.existsByEmailTenant(tenantId, dto.email, id);
      if (exists) {
        throw new ConflictException(msg(ErrorMessages.PARTNER_EMAIL_EXISTS, dto.email));
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
    if (dto.type !== undefined) {
      updates.push('type = :type');
      replacements.type = dto.type;
      const { isCustomer, isSupplier } = this.resolveCustomerSupplierFlags(dto.type);
      updates.push('"isCustomer" = :isCustomer');
      replacements.isCustomer = isCustomer;
      updates.push('"isSupplier" = :isSupplier');
      replacements.isSupplier = isSupplier;
    }
    if (dto.taxNumber !== undefined) {
      updates.push('"taxNumber" = :taxNumber');
      replacements.taxNumber = dto.taxNumber;
    }
    if (dto.vatNumber !== undefined) {
      updates.push('"vatNumber" = :vatNumber');
      replacements.vatNumber = dto.vatNumber;
    }
    if (dto.phone !== undefined) {
      updates.push('phone = :phone');
      replacements.phone = dto.phone;
    }
    if (dto.mobile !== undefined) {
      updates.push('mobile = :mobile');
      replacements.mobile = dto.mobile;
    }
    if (dto.email !== undefined) {
      updates.push('email = :email');
      replacements.email = dto.email;
    }
    if (dto.website !== undefined) {
      updates.push('website = :website');
      replacements.website = dto.website;
    }
    if (dto.street !== undefined) {
      updates.push('street = :street');
      replacements.street = dto.street;
    }
    if (dto.city !== undefined) {
      updates.push('city = :city');
      replacements.city = dto.city;
    }
    if (dto.state !== undefined) {
      updates.push('state = :state');
      replacements.state = dto.state;
    }
    if (dto.country !== undefined) {
      updates.push('country = :country');
      replacements.country = dto.country;
    }
    if (dto.zip !== undefined) {
      updates.push('zip = :zip');
      replacements.zip = dto.zip;
    }
    if (dto.creditLimit !== undefined) {
      updates.push('"creditLimit" = :creditLimit');
      replacements.creditLimit = dto.creditLimit;
    }
    if (dto.paymentTermId !== undefined) {
      updates.push('"paymentTermId" = :paymentTermId');
      replacements.paymentTermId = dto.paymentTermId;
    }
    if (dto.pricelistId !== undefined) {
      updates.push('"pricelistId" = :pricelistId');
      replacements.pricelistId = dto.pricelistId;
    }
    if (dto.arAccountId !== undefined) {
      updates.push('"arAccountId" = :arAccountId');
      replacements.arAccountId = dto.arAccountId;
    }
    if (dto.apAccountId !== undefined) {
      updates.push('"apAccountId" = :apAccountId');
      replacements.apAccountId = dto.apAccountId;
    }
    if (dto.fiscalPositionId !== undefined) {
      updates.push('"fiscalPositionId" = :fiscalPositionId');
      replacements.fiscalPositionId = dto.fiscalPositionId;
    }
    if (dto.bankIban !== undefined) {
      updates.push('"bankIban" = :bankIban');
      replacements.bankIban = dto.bankIban;
    }
    if (dto.bankName !== undefined) {
      updates.push('"bankName" = :bankName');
      replacements.bankName = dto.bankName;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }
    if (dto.isActive !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isActive;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId ?? null;
    updates.push('"updatedAt" = NOW()');

    await this.partnersRepository.updatePartner(tenantId, id, updates, replacements);

    const updated = await this.partnersRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'partners.partners',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.partnersRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_NOT_FOUND, id));
    }

    await this.partnersRepository.softDeletePartner(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(
      tenantId,
      'partners.partners',
      id,
      existing,
      auditContext.userId,
    );
  }

  async findByType(tenantId: string, type: PartnerType, query: FilterPartnerDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.partnersRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'ASC',
      type,
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

  async getCustomerSummary(tenantId: string) {
    return this.partnersRepository.getCustomerSummary(tenantId);
  }

  async getDropdown(tenantId: string, query: PartnerDropdownQueryDto) {
    return this.partnersRepository.findDropdown(tenantId, {
      search: query.search,
      limit: query.limit || 100,
      type: query.type,
    });
  }

  private resolveCustomerSupplierFlags(type: PartnerType): {
    isCustomer: boolean;
    isSupplier: boolean;
  } {
    switch (type) {
      case PartnerType.CUSTOMER:
        return { isCustomer: true, isSupplier: false };
      case PartnerType.SUPPLIER:
        return { isCustomer: false, isSupplier: true };
      case PartnerType.BOTH:
        return { isCustomer: true, isSupplier: true };
      case PartnerType.INDIVIDUAL:
        return { isCustomer: true, isSupplier: false };
      default:
        return { isCustomer: false, isSupplier: false };
    }
  }
}
