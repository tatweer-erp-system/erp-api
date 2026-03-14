import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Lead } from '../entities/lead.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeadsRepository extends BaseRepository<Lead> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Lead, true);
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
      `SELECT l.*, c."firstName" as "contactFirstName", c."lastName" as "contactLastName"
       FROM leads l
       LEFT JOIN contacts c ON c.id = l."contactId"
       WHERE l."deletedAt" IS NULL AND l."tenantId" = :tenantId ${whereClause}
       ORDER BY l."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM leads WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT l.*, c."firstName" as "contactFirstName", c."lastName" as "contactLastName"
       FROM leads l
       LEFT JOIN contacts c ON c.id = l."contactId"
       WHERE l.id = :id AND l."deletedAt" IS NULL AND l."tenantId" = :tenantId`,
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
      currencyId?: string | null;
      valueBase?: number | null;
      assignedTo?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO leads (id, "tenantId", title, "contactId", value, currency, "currencyId", "valueBase", status, priority, "assignedTo", notes, "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :title, :contactId, :value, 'SAR', :currencyId, :valueBase, 'new', 'medium', :assignedTo, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          title: data.title,
          contactId: data.contactId ?? null,
          value: data.value ?? null,
          currencyId: data.currencyId ?? null,
          valueBase: data.valueBase ?? null,
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
      `UPDATE leads SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
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
      `UPDATE leads SET status = :status, notes = COALESCE(:reason, notes), "updatedBy" = :updatedBy, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
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

  async winLead(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET status = 'won', "wonAt" = NOW(), "updatedBy" = :updatedBy, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async loseLead(
    tenantId: string,
    id: string,
    lostReason: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET status = 'lost', "lostAt" = NOW(), "lostReason" = :lostReason, "updatedBy" = :updatedBy, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, lostReason, updatedBy } } as any,
    );
  }

  async reassignLeadsToContact(
    tenantId: string,
    fromContactId: string,
    toContactId: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET "contactId" = :toContactId, "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE "contactId" = :fromContactId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { fromContactId, toContactId, tenantId, updatedBy } } as any,
    );
  }

  async getPipeline(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [summary] = await sequelize.query(
      `SELECT
         status,
         COUNT(*)::int as count,
         COALESCE(SUM(COALESCE("valueBase", value, 0)), 0)::numeric(15,2) as "totalValue"
       FROM leads
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId
       GROUP BY status
       ORDER BY status`,
      { replacements: { tenantId } },
    );

    const [leads] = await sequelize.query(
      `SELECT id, title, "contactId", value, "currencyId", "valueBase", priority, "assignedTo", "expectedCloseDate", status
       FROM leads
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId
       ORDER BY "createdAt" DESC`,
      { replacements: { tenantId } },
    );

    return { summary: summary as any[], leads: leads as any[] };
  }

  async getConversionReport(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [overallResult] = await sequelize.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'won')::int as "wonCount",
         COUNT(*) FILTER (WHERE status = 'lost')::int as "lostCount",
         COALESCE(AVG(COALESCE("valueBase", value)) FILTER (WHERE status = 'won'), 0)::numeric(15,2) as "avgDealSize",
         COALESCE(AVG(EXTRACT(EPOCH FROM ("wonAt" - "createdAt")) / 86400) FILTER (WHERE status = 'won' AND "wonAt" IS NOT NULL), 0)::numeric(10,1) as "avgDaysToClose"
       FROM leads
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    const [byAssignee] = await sequelize.query(
      `SELECT
         "assignedTo",
         COUNT(*) FILTER (WHERE status = 'won')::int as "wonCount",
         COUNT(*) FILTER (WHERE status = 'lost')::int as "lostCount",
         COALESCE(AVG(COALESCE("valueBase", value)) FILTER (WHERE status = 'won'), 0)::numeric(15,2) as "avgDealSize",
         COALESCE(AVG(EXTRACT(EPOCH FROM ("wonAt" - "createdAt")) / 86400) FILTER (WHERE status = 'won' AND "wonAt" IS NOT NULL), 0)::numeric(10,1) as "avgDaysToClose"
       FROM leads
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "assignedTo" IS NOT NULL
       GROUP BY "assignedTo"`,
      { replacements: { tenantId } },
    );

    return { overall: (overallResult as any[])[0], byAssignee: byAssignee as any[] };
  }

  async findLeadsClosingSoon(tenantId: string, daysThreshold: number) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id, title, "assignedTo", "expectedCloseDate"
       FROM leads
       WHERE "deletedAt" IS NULL
         AND "tenantId" = :tenantId
         AND status NOT IN ('won', 'lost')
         AND "expectedCloseDate" IS NOT NULL
         AND "expectedCloseDate" <= (CURRENT_DATE + :daysThreshold * INTERVAL '1 day')
         AND "expectedCloseDate" >= CURRENT_DATE`,
      { replacements: { tenantId, daysThreshold } },
    );
    return rows as any[];
  }

  async findByContactId(tenantId: string, contactId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM leads WHERE "contactId" = :contactId AND "tenantId" = :tenantId AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`,
      { replacements: { contactId, tenantId } },
    );
    return rows;
  }

  async softDeleteLead(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search ? `AND (title ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, title, status FROM leads WHERE "deletedAt" IS NULL AND status NOT IN ('won', 'lost') AND "tenantId" = :tenantId ${whereClause} ORDER BY title LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
