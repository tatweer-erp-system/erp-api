import { Injectable } from '@nestjs/common';
import { PartnersService } from '@/modules/partners/services/partners.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { FilterPartnerDto } from '@/modules/partners/dto/filter-partner.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PartnerType } from '@/common/enums/partner.enums';

/**
 * ContactsService delegates to PartnersService for backward compatibility.
 * The contacts endpoints continue to work but all data flows through Partners.
 */
@Injectable()
export class ContactsService {
  constructor(private readonly partnersService: PartnersService) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.partnersService.findAll(tenantId, {
      ...pagination,
      isCustomer: true,
    } as FilterPartnerDto);
  }

  async findById(tenantId: string, id: string) {
    return this.partnersService.findOne(tenantId, id);
  }

  async create(tenantId: string, dto: CreateContactDto, auditContext: AuditContext) {
    return this.partnersService.create(
      tenantId,
      {
        nameEn: `${dto.firstNameEn} ${dto.lastNameEn}`,
        nameAr: `${dto.firstNameAr} ${dto.lastNameAr}`,
        type: PartnerType.CUSTOMER,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
      } as any,
      auditContext,
    );
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto, auditContext: AuditContext) {
    const updateData: Record<string, unknown> = {};

    if (dto.firstNameEn !== undefined || dto.lastNameEn !== undefined) {
      // We need to build the full name; fetch existing to fill in gaps
      const existing = await this.partnersService.findOne(tenantId, id);
      const currentParts = (existing as any).nameEn?.split(' ') ?? ['', ''];
      const firstName = dto.firstNameEn ?? currentParts[0] ?? '';
      const lastName = dto.lastNameEn ?? currentParts.slice(1).join(' ') ?? '';
      updateData.nameEn = `${firstName} ${lastName}`.trim();
    }

    if (dto.firstNameAr !== undefined || dto.lastNameAr !== undefined) {
      const existing = await this.partnersService.findOne(tenantId, id);
      const currentParts = (existing as any).nameAr?.split(' ') ?? ['', ''];
      const firstName = dto.firstNameAr ?? currentParts[0] ?? '';
      const lastName = dto.lastNameAr ?? currentParts.slice(1).join(' ') ?? '';
      updateData.nameAr = `${firstName} ${lastName}`.trim();
    }

    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.partnersService.update(tenantId, id, updateData as any, auditContext);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.partnersService.remove(tenantId, id, auditContext);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    return this.partnersService.getDropdown(tenantId, { ...query, type: PartnerType.CUSTOMER });
  }
}
