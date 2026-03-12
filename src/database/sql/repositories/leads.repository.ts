import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../base.repository';
import { Lead } from '../entities/lead.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeadsRepository extends TenantAwareRepository<Lead> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Lead);
  }

  // ── Raw SQL data-access methods ─────────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search ? `AND (title ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT l.*, c.first_name as contact_first_name, c.last_name as contact_last_name
       FROM leads l
       LEFT JOIN contacts c ON c.id = l.contact_id
       WHERE l.deleted_at IS NULL AND l.tenant_id = :tenantId ${whereClause}
       ORDER BY l.created_at ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM leads WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT l.*, c.first_name as contact_first_name, c.last_name as contact_last_name
       FROM leads l
       LEFT JOIN contacts c ON c.id = l.contact_id
       WHERE l.id = :id AND l.deleted_at IS NULL AND l.tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertLead(
    tenantId: string,
    data: {
      title: string;
      contactId?: string | null;
      value?: number | null;
      assignedTo?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO leads (id, tenant_id, title, contact_id, value, currency, status, priority, assigned_to, notes, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :tenantId, :title, :contactId, :value, 'SAR', 'new', 'medium', :assignedTo, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          title: data.title,
          contactId: data.contactId ?? null,
          value: data.value ?? null,
          assignedTo: data.assignedTo ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateLead(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = :id AND tenant_id = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async transitionStatus(
    tenantId: string,
    id: string,
    data: { status: string; reason?: string | null; updatedBy?: string | null },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET status = :status, notes = COALESCE(:reason, notes), updated_by = :updatedBy, updated_at = NOW() WHERE id = :id AND tenant_id = :tenantId`,
      {
        replacements: {
          id,
          tenantId,
          status: data.status,
          reason: data.reason ?? null,
          updatedBy: data.updatedBy ?? null,
        },
      } as any,
    );
  }

  async softDeleteLead(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search ? `AND (title ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, title, status FROM leads WHERE deleted_at IS NULL AND status NOT IN ('won', 'lost') AND tenant_id = :tenantId ${whereClause} ORDER BY title LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
