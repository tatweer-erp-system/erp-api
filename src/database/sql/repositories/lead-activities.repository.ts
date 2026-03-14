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
      fromStatus?: string | null;
      toStatus?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO lead_activities (id, "tenantId", "leadId", "userId", "activityType", "fromStatus", "toStatus", notes, "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :leadId, :userId, :activityType, :fromStatus, :toStatus, :notes, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          leadId: data.leadId,
          userId: data.userId,
          activityType: data.activityType,
          fromStatus: data.fromStatus ?? null,
          toStatus: data.toStatus ?? null,
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
      `SELECT * FROM lead_activities
       WHERE "leadId" = :leadId AND "tenantId" = :tenantId AND "deletedAt" IS NULL
       ORDER BY "createdAt" DESC`,
      { replacements: { leadId, tenantId } },
    );
    return rows;
  }
}
