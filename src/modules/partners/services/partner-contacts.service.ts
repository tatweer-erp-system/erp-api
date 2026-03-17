import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PartnerContactsRepository } from '@/database/sql/repositories/partner-contacts.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { CreatePartnerContactDto } from '../dto/create-partner-contact.dto';
import { UpdatePartnerContactDto } from '../dto/update-partner-contact.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class PartnerContactsService {
  private readonly logger = new Logger(PartnerContactsService.name);

  constructor(
    private readonly partnerContactsRepository: PartnerContactsRepository,
    private readonly partnersRepository: PartnersRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantId: string, partnerId: string, query: PaginationDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    // Verify partner exists
    const partner = await this.partnersRepository.findOneById(tenantId, partnerId);
    if (!partner) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_NOT_FOUND, partnerId));
    }

    const { rows, total } = await this.partnerContactsRepository.findAllByPartnerId(
      tenantId,
      partnerId,
      {
        limit,
        offset,
        search: query.search,
        sortOrder: query.sortOrder || 'ASC',
      },
    );

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
    const contact = await this.partnerContactsRepository.findOneById(tenantId, id);
    if (!contact) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_CONTACT_NOT_FOUND, id));
    }
    return contact;
  }

  async create(tenantId: string, dto: CreatePartnerContactDto, auditContext: AuditContext) {
    // Verify partner exists
    const partner = await this.partnersRepository.findOneById(tenantId, dto.partnerId);
    if (!partner) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_NOT_FOUND, dto.partnerId));
    }

    const id = await this.partnerContactsRepository.insertPartnerContact(tenantId, {
      partnerId: dto.partnerId,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      phone: dto.phone ?? null,
      mobile: dto.mobile ?? null,
      email: dto.email ?? null,
      position: dto.position ?? null,
      isMain: dto.isMain ?? false,
      createdBy: auditContext.userId ?? null,
    });

    const contact = await this.partnerContactsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'partners.partner_contacts',
      id,
      contact,
      auditContext.userId,
    );

    return contact;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePartnerContactDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.partnerContactsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_CONTACT_NOT_FOUND, id));
    }
    const before = { ...existing };

    const updates: string[] = [];
    const replacements: Record<string, unknown> = { id };

    if (dto.firstName !== undefined) {
      updates.push('"firstName" = :firstName');
      replacements.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      updates.push('"lastName" = :lastName');
      replacements.lastName = dto.lastName;
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
    if (dto.position !== undefined) {
      updates.push('position = :position');
      replacements.position = dto.position;
    }
    if (dto.isMain !== undefined) {
      updates.push('"isMain" = :isMain');
      replacements.isMain = dto.isMain;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId ?? null;
    updates.push('"updatedAt" = NOW()');

    await this.partnerContactsRepository.updatePartnerContact(tenantId, id, updates, replacements);

    const updated = await this.partnerContactsRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'partners.partner_contacts',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.partnerContactsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_CONTACT_NOT_FOUND, id));
    }

    await this.partnerContactsRepository.softDeletePartnerContact(
      tenantId,
      id,
      auditContext.userId ?? null,
    );

    await this.auditService.logDelete(
      tenantId,
      'partners.partner_contacts',
      id,
      existing,
      auditContext.userId,
    );
  }
}
