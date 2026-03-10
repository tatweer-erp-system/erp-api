import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0 } = pagination;
    const [rows] = await sequelize.query(
      `SELECT * FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset }, type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM leads WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const lead = (rows as any[])[0];
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(tenantSlug: string, dto: CreateLeadDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO leads (id, title, contact_id, value, currency, status, priority, assigned_to, expected_close_date, notes, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :title, :contactId, :value, :currency, :status, :priority, :assignedTo, :expectedCloseDate, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          title: dto.title,
          contactId: dto.contactId ?? null,
          value: dto.value ?? null,
          currency: dto.currency ?? 'USD',
          status: dto.status ?? 'new',
          priority: dto.priority ?? 'medium',
          assignedTo: dto.assignedTo ?? null,
          expectedCloseDate: dto.expectedCloseDate ?? null,
          notes: dto.notes ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string): Promise<void> {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`UPDATE leads SET deleted_at = NOW() WHERE id = :id`, {
      replacements: { id },
    } as any);
  }
}
