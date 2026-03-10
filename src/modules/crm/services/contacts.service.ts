import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';

@Injectable()
export class ContactsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? `AND (first_name ILIKE :search OR last_name ILIKE :search OR email ILIKE :search OR company ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM contacts WHERE deleted_at IS NULL ${whereClause} ORDER BY first_name, last_name LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM contacts WHERE deleted_at IS NULL ${whereClause}`,
      { replacements: { search: search ? `%${search}%` : '' }, type: 'SELECT' } as any,
    );
    const total = parseInt((countResult as any[])[0]?.total ?? '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM contacts WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const contact = (rows as any[])[0];
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(tenantSlug: string, dto: CreateContactDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Check email uniqueness
    if (dto.email) {
      const [existing] = await sequelize.query(
        `SELECT id FROM contacts WHERE email = :email AND deleted_at IS NULL`,
        { replacements: { email: dto.email }, type: 'SELECT' } as any,
      );
      if ((existing as any[]).length > 0) {
        throw new ConflictException(`Contact with email '${dto.email}' already exists`);
      }
    }

    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO contacts (id, first_name, last_name, email, phone, company, position, notes, status, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :firstName, :lastName, :email, :phone, :company, :position, :notes, 'active', :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          firstName: dto.firstName_en,
          lastName: dto.lastName_en,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          company: dto.company_en ?? null,
          position: dto.position ?? null,
          notes: dto.notes ?? null,
          createdBy: auditContext.userId ?? null,
        },
      } as any,
    );
    return this.findById(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateContactDto, auditContext: AuditContext) {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Check email uniqueness if changing email
    if (dto.email) {
      const [existing] = await sequelize.query(
        `SELECT id FROM contacts WHERE email = :email AND id != :id AND deleted_at IS NULL`,
        { replacements: { email: dto.email, id }, type: 'SELECT' } as any,
      );
      if ((existing as any[]).length > 0) {
        throw new ConflictException(`Contact with email '${dto.email}' already exists`);
      }
    }

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.firstName_en !== undefined) {
      updates.push('first_name = :firstName');
      replacements.firstName = dto.firstName_en;
    }
    if (dto.lastName_en !== undefined) {
      updates.push('last_name = :lastName');
      replacements.lastName = dto.lastName_en;
    }
    if (dto.email !== undefined) {
      updates.push('email = :email');
      replacements.email = dto.email;
    }
    if (dto.phone !== undefined) {
      updates.push('phone = :phone');
      replacements.phone = dto.phone;
    }
    if (dto.company_en !== undefined) {
      updates.push('company = :company');
      replacements.company = dto.company_en;
    }
    if (dto.position !== undefined) {
      updates.push('position = :position');
      replacements.position = dto.position;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }

    await sequelize.query(`UPDATE contacts SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE contacts SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { search, limit = 50 } = query;
    const whereClause = search
      ? `AND (first_name ILIKE :search OR last_name ILIKE :search OR email ILIKE :search OR company ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, first_name, last_name, email, company FROM contacts WHERE deleted_at IS NULL AND status = 'active' ${whereClause} ORDER BY first_name, last_name LIMIT :limit`,
      {
        replacements: { limit, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );
    return rows;
  }
}
