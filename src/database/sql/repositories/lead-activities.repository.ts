import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LeadActivity } from '../entities/lead-activity.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeadActivitiesRepository extends BaseRepository<LeadActivity> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(LeadActivity, true);
  }

  // ── Raw SQL data-access methods ─────────────────────────────────────────────

  async insertActivity(
    tenantId: string,
    data: {
      leadId: string;
      userId: string;
      activityType: string;
      fromStageId?: string | null;
      toStageId?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO lead_activities (id, "tenantId", "leadId", "userId", "activityType", "fromStageId", "toStageId", notes, "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :leadId, :userId, :activityType, :fromStageId, :toStageId, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          leadId: data.leadId,
          userId: data.userId,
          activityType: data.activityType,
          fromStageId: data.fromStageId ?? null,
          toStageId: data.toStageId ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async findByLeadId(tenantId: string, leadId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT la.*,
              fs."nameEn" as "fromStageNameEn", fs."nameAr" as "fromStageNameAr",
              ts."nameEn" as "toStageNameEn", ts."nameAr" as "toStageNameAr"
       FROM lead_activities la
       LEFT JOIN crm_stages fs ON fs.id = la."fromStageId"
       LEFT JOIN crm_stages ts ON ts.id = la."toStageId"
       WHERE la."leadId" = :leadId AND la."tenantId" = :tenantId AND la."deletedAt" IS NULL
       ORDER BY la."createdAt" DESC`,
      { replacements: { leadId, tenantId } },
    );
    return rows;
  }
}
