import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { StatusTransitionSharedService } from '../../../shared/services/status-transition.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { TransitionLeadDto } from '../dto/transition-lead.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';

@Injectable()
export class LeadsService {
  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly statusTransitionService: StatusTransitionSharedService,
  ) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = search ? `AND (title ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT l.*, c.first_name as contact_first_name, c.last_name as contact_last_name
       FROM leads l
       LEFT JOIN contacts c ON c.id = l.contact_id
       WHERE l.deleted_at IS NULL ${whereClause}
       ORDER BY l.created_at ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM leads WHERE deleted_at IS NULL ${whereClause}`,
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
      `SELECT l.*, c.first_name as contact_first_name, c.last_name as contact_last_name
       FROM leads l
       LEFT JOIN contacts c ON c.id = l.contact_id
       WHERE l.id = :id AND l.deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const lead = (rows as any[])[0];
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(tenantSlug: string, dto: CreateLeadDto, auditContext: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO leads (id, title, contact_id, value, currency, status, priority, assigned_to, notes, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :title, :contactId, :value, 'SAR', 'new', 'medium', :assignedTo, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          title: dto.title_en,
          contactId: dto.contactId ?? null,
          value: dto.estimatedValue ?? null,
          assignedTo: dto.assignedTo ?? null,
          notes: dto.notes ?? null,
          createdBy: auditContext.userId ?? null,
        },
      } as any,
    );
    return this.findById(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateLeadDto, auditContext: AuditContext) {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.title_en !== undefined) {
      updates.push('title = :title');
      replacements.title = dto.title_en;
    }
    if (dto.contactId !== undefined) {
      updates.push('contact_id = :contactId');
      replacements.contactId = dto.contactId;
    }
    if (dto.assignedTo !== undefined) {
      updates.push('assigned_to = :assignedTo');
      replacements.assignedTo = dto.assignedTo;
    }
    if (dto.estimatedValue !== undefined) {
      updates.push('value = :value');
      replacements.value = dto.estimatedValue;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }

    await sequelize.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);

    return this.findById(tenantSlug, id);
  }

  async transition(
    tenantSlug: string,
    id: string,
    dto: TransitionLeadDto,
    auditContext: AuditContext,
  ) {
    const lead = await this.findById(tenantSlug, id);
    const currentStatus = lead.status;

    // Validate transition
    this.statusTransitionService.validateOrThrow('lead', currentStatus, dto.status);

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE leads SET status = :status, notes = COALESCE(:reason, notes), updated_by = :updatedBy, updated_at = NOW() WHERE id = :id`,
      {
        replacements: {
          id,
          status: dto.status,
          reason: dto.reason ?? null,
          updatedBy: auditContext.userId ?? null,
        },
      } as any,
    );

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE leads SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext.userId ?? null } } as any,
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { search, limit = 50 } = query;
    const whereClause = search ? `AND (title ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, title, status FROM leads WHERE deleted_at IS NULL AND status NOT IN ('won', 'lost') ${whereClause} ORDER BY title LIMIT :limit`,
      {
        replacements: { limit, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );
    return rows;
  }
}
