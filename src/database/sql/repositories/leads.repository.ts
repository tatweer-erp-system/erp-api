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
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder: string;
      stageId?: string;
      type?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder, stageId, type } = options;

    let whereClause = '';
    if (search) whereClause += ' AND (l.title ILIKE :search)';
    if (stageId) whereClause += ' AND l."stageId" = :stageId';
    if (type) whereClause += ' AND l.type = :type';

    const [rows] = await sequelize.query(
      `SELECT l.*,
              s."nameEn" as "stageNameEn", s."nameAr" as "stageNameAr", s.sequence as "stageSequence",
              p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr"
       FROM leads l
       LEFT JOIN crm_stages s ON s.id = l."stageId" AND s."deletedAt" IS NULL
       LEFT JOIN partners p ON p.id = l."partnerId" AND p."deletedAt" IS NULL
       WHERE l."deletedAt" IS NULL AND l."tenantId" = :tenantId ${whereClause}
       ORDER BY l."createdAt" ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          tenantId,
          limit,
          offset,
          search: search ? `%${search}%` : '',
          stageId: stageId ?? null,
          type: type ?? null,
        },
      } as any,
    );

    let countWhere = '';
    if (search) countWhere += ' AND (title ILIKE :search)';
    if (stageId) countWhere += ' AND "stageId" = :stageId';
    if (type) countWhere += ' AND type = :type';

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM leads WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${countWhere}`,
      {
        replacements: {
          tenantId,
          search: search ? `%${search}%` : '',
          stageId: stageId ?? null,
          type: type ?? null,
        },
      },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT l.*,
              s."nameEn" as "stageNameEn", s."nameAr" as "stageNameAr", s.sequence as "stageSequence",
              s."isWon" as "stageIsWon", s.probability as "stageProbability",
              p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr"
       FROM leads l
       LEFT JOIN crm_stages s ON s.id = l."stageId" AND s."deletedAt" IS NULL
       LEFT JOIN partners p ON p.id = l."partnerId" AND p."deletedAt" IS NULL
       WHERE l.id = :id AND l."deletedAt" IS NULL AND l."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertLead(
    tenantId: string,
    data: {
      title: string;
      stageId?: string | null;
      partnerId?: string | null;
      type?: string;
      probability?: number | null;
      expectedRevenue?: number | null;
      currencyId?: string | null;
      expectedRevenueBase?: number | null;
      priority?: string;
      assignedTo?: string | null;
      expectedCloseDate?: string | null;
      source?: string | null;
      campaign?: string | null;
      medium?: string | null;
      tags?: string[] | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO leads (
        id, "tenantId", title, "stageId", "partnerId", type, probability,
        "expectedRevenue", "currencyId", "expectedRevenueBase",
        priority, "assignedTo", "expectedCloseDate",
        source, campaign, medium, tags, notes,
        "isWon", "isLost",
        "createdBy", "updatedBy", "createdAt", "updatedAt"
      ) VALUES (
        :id, :tenantId, :title, :stageId, :partnerId, :type, :probability,
        :expectedRevenue, :currencyId, :expectedRevenueBase,
        :priority, :assignedTo, :expectedCloseDate,
        :source, :campaign, :medium, :tags, :notes,
        false, false,
        :createdBy, :createdBy, NOW(), NOW()
      )`,
      {
        replacements: {
          id,
          tenantId,
          title: data.title,
          stageId: data.stageId ?? null,
          partnerId: data.partnerId ?? null,
          type: data.type ?? 'lead',
          probability: data.probability ?? null,
          expectedRevenue: data.expectedRevenue ?? null,
          currencyId: data.currencyId ?? null,
          expectedRevenueBase: data.expectedRevenueBase ?? null,
          priority: data.priority ?? 'medium',
          assignedTo: data.assignedTo ?? null,
          expectedCloseDate: data.expectedCloseDate ?? null,
          source: data.source ?? null,
          campaign: data.campaign ?? null,
          medium: data.medium ?? null,
          tags: data.tags ?? null,
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

  async changeStage(
    tenantId: string,
    id: string,
    data: {
      stageId: string;
      probability: number;
      updatedBy?: string | null;
    },
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET "stageId" = :stageId, probability = :probability,
       "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: {
          id,
          tenantId,
          stageId: data.stageId,
          probability: data.probability,
          updatedBy: data.updatedBy ?? null,
        },
      } as any,
    );
  }

  async winLead(
    tenantId: string,
    id: string,
    stageId: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET "isWon" = true, "stageId" = :stageId, probability = 100,
       "wonAt" = NOW(), "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, stageId, updatedBy } } as any,
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
      `UPDATE leads SET "isLost" = true, probability = 0,
       "lostAt" = NOW(), "lostReason" = :lostReason,
       "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, lostReason, updatedBy } } as any,
    );
  }

  async convertToOpportunity(
    tenantId: string,
    id: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET type = 'opportunity', "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async setSaleOrderId(tenantId: string, id: string, saleOrderId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET "saleOrderId" = :saleOrderId, "updatedAt" = NOW()
       WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, saleOrderId } } as any,
    );
  }

  async reassignLeadsToPartner(
    tenantId: string,
    fromPartnerId: string,
    toPartnerId: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leads SET "partnerId" = :toPartnerId, "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE "partnerId" = :fromPartnerId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { fromPartnerId, toPartnerId, tenantId, updatedBy } } as any,
    );
  }

  async getPipelineByStage(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Get all stages with their lead counts and totals
    const [stages] = await sequelize.query(
      `SELECT
         s.id as "stageId", s."nameEn", s."nameAr", s.sequence, s.probability as "stageProbability",
         s."isWon", s."isFolded",
         COUNT(l.id)::int as count,
         COALESCE(SUM(COALESCE(l."expectedRevenueBase", l."expectedRevenue", 0)), 0)::numeric(15,2) as "totalValue"
       FROM crm_stages s
       LEFT JOIN leads l ON l."stageId" = s.id AND l."deletedAt" IS NULL AND l."tenantId" = :tenantId AND l."isLost" = false
       WHERE s."deletedAt" IS NULL AND s."tenantId" = :tenantId
       GROUP BY s.id, s."nameEn", s."nameAr", s.sequence, s.probability, s."isWon", s."isFolded"
       ORDER BY s.sequence ASC`,
      { replacements: { tenantId } },
    );

    // Get all active (non-lost) leads grouped for pipeline view
    const [leads] = await sequelize.query(
      `SELECT l.id, l.title, l."partnerId", l."expectedRevenue", l."currencyId",
              l."expectedRevenueBase", l.priority, l."assignedTo", l."expectedCloseDate",
              l."stageId", l.type, l.probability, l."isWon",
              p."nameEn" as "partnerNameEn", p."nameAr" as "partnerNameAr"
       FROM leads l
       LEFT JOIN partners p ON p.id = l."partnerId" AND p."deletedAt" IS NULL
       WHERE l."deletedAt" IS NULL AND l."tenantId" = :tenantId AND l."isLost" = false
       ORDER BY l."createdAt" DESC`,
      { replacements: { tenantId } },
    );

    return { stages: stages as any[], leads: leads as any[] };
  }

  async getConversionReport(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [overallResult] = await sequelize.query(
      `SELECT
         COUNT(*) FILTER (WHERE "isWon" = true)::int as "wonCount",
         COUNT(*) FILTER (WHERE "isLost" = true)::int as "lostCount",
         COALESCE(AVG(COALESCE("expectedRevenueBase", "expectedRevenue")) FILTER (WHERE "isWon" = true), 0)::numeric(15,2) as "avgDealSize",
         COALESCE(AVG(EXTRACT(EPOCH FROM ("wonAt" - "createdAt")) / 86400) FILTER (WHERE "isWon" = true AND "wonAt" IS NOT NULL), 0)::numeric(10,1) as "avgDaysToClose"
       FROM leads
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { tenantId } },
    );

    const [byAssignee] = await sequelize.query(
      `SELECT
         "assignedTo",
         COUNT(*) FILTER (WHERE "isWon" = true)::int as "wonCount",
         COUNT(*) FILTER (WHERE "isLost" = true)::int as "lostCount",
         COALESCE(AVG(COALESCE("expectedRevenueBase", "expectedRevenue")) FILTER (WHERE "isWon" = true), 0)::numeric(15,2) as "avgDealSize",
         COALESCE(AVG(EXTRACT(EPOCH FROM ("wonAt" - "createdAt")) / 86400) FILTER (WHERE "isWon" = true AND "wonAt" IS NOT NULL), 0)::numeric(10,1) as "avgDaysToClose"
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
         AND "isWon" = false AND "isLost" = false
         AND "expectedCloseDate" IS NOT NULL
         AND "expectedCloseDate" <= (CURRENT_DATE + :daysThreshold * INTERVAL '1 day')
         AND "expectedCloseDate" >= CURRENT_DATE`,
      { replacements: { tenantId, daysThreshold } },
    );
    return rows as any[];
  }

  async findByPartnerId(tenantId: string, partnerId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM leads WHERE "partnerId" = :partnerId AND "tenantId" = :tenantId AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`,
      { replacements: { partnerId, tenantId } },
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
    const whereClause = search ? 'AND (title ILIKE :search)' : '';

    const [rows] = await sequelize.query(
      `SELECT l.id, l.title, l.type, s."nameEn" as "stageNameEn", s."nameAr" as "stageNameAr"
       FROM leads l
       LEFT JOIN crm_stages s ON s.id = l."stageId" AND s."deletedAt" IS NULL
       WHERE l."deletedAt" IS NULL AND l."isWon" = false AND l."isLost" = false
         AND l."tenantId" = :tenantId ${whereClause}
       ORDER BY l.title LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
