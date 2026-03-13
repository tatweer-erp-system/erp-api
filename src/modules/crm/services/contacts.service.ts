import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ContactsRepository } from '@/database/sql/repositories/contacts.repository';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class ContactsService {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.contactsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search,
      sortOrder,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const contact = await this.contactsRepository.findOneById(tenantId, id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(tenantId: string, dto: CreateContactDto, auditContext: AuditContext) {
    // Check email uniqueness
    if (dto.email) {
      const exists = await this.contactsRepository.findExistingByEmail(tenantId, dto.email);
      if (exists) {
        throw new ConflictException(`Contact with email '${dto.email}' already exists`);
      }
    }

    const id = await this.contactsRepository.insertContact(tenantId, {
      firstName: dto.firstNameEn,
      lastName: dto.lastNameEn,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      company: dto.companyEn ?? null,
      position: dto.position ?? null,
      notes: dto.notes ?? null,
      createdBy: auditContext.userId ?? null,
    });
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto, auditContext: AuditContext) {
    await this.findById(tenantId, id);

    // Check email uniqueness if changing email
    if (dto.email) {
      const exists = await this.contactsRepository.findExistingByEmail(tenantId, dto.email, id);
      if (exists) {
        throw new ConflictException(`Contact with email '${dto.email}' already exists`);
      }
    }

    const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.firstNameEn !== undefined) {
      updates.push('"firstName" = :firstName');
      replacements.firstName = dto.firstNameEn;
    }
    if (dto.lastNameEn !== undefined) {
      updates.push('"lastName" = :lastName');
      replacements.lastName = dto.lastNameEn;
    }
    if (dto.email !== undefined) {
      updates.push('email = :email');
      replacements.email = dto.email;
    }
    if (dto.phone !== undefined) {
      updates.push('phone = :phone');
      replacements.phone = dto.phone;
    }
    if (dto.companyEn !== undefined) {
      updates.push('company = :company');
      replacements.company = dto.companyEn;
    }
    if (dto.position !== undefined) {
      updates.push('position = :position');
      replacements.position = dto.position;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }

    await this.contactsRepository.updateContact(tenantId, id, updates, replacements);

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantId, id);
    await this.contactsRepository.softDeleteContact(tenantId, id, auditContext.userId ?? null);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.contactsRepository.findDropdown(tenantId, { search, limit });
  }
}
