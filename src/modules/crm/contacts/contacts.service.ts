import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0, search } = pagination;
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
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM contacts WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const contact = (rows as any[])[0];
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(tenantSlug: string, dto: CreateContactDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO contacts (id, first_name, last_name, email, phone, company, position, notes, status, assigned_to, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :firstName, :lastName, :email, :phone, :company, :position, :notes, 'active', :assignedTo, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          ...dto,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          company: dto.company ?? null,
          position: dto.position ?? null,
          notes: dto.notes ?? null,
          assignedTo: dto.assignedTo ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string): Promise<void> {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`UPDATE contacts SET deleted_at = NOW() WHERE id = :id`, {
      replacements: { id },
    } as any);
  }
}
