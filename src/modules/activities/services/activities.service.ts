import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { ActivitiesRepository } from '@/database/sql/repositories/activities.repository';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { UpdateActivityDto } from '../dto/update-activity.dto';
import { MarkDoneActivityDto } from '../dto/mark-done-activity.dto';
import { FilterActivityDto } from '../dto/filter-activity.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly auditService: AuditSharedService,
    private readonly outboxSharedService: OutboxSharedService,
  ) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: FilterActivityDto) {
    const where = this.buildWhereClause(query);

    return this.activitiesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['summary', 'recordName'],
      sortBy: query.sortBy ?? 'scheduledDate',
      sortOrder: query.sortOrder ?? 'ASC',
      where,
      tenantId,
    });
  }

  async findMyActivities(tenantId: string, userId: string, query: FilterActivityDto) {
    const where = this.buildWhereClause(query);
    where.assignedTo = userId;

    return this.activitiesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['summary', 'recordName'],
      sortBy: query.sortBy ?? 'scheduledDate',
      sortOrder: query.sortOrder ?? 'ASC',
      where,
      tenantId,
    });
  }

  async findOverdue(tenantId: string, query: FilterActivityDto) {
    const where = this.buildWhereClause(query);
    where.isDone = false;
    where.scheduledDate = { [Op.lt]: new Date().toISOString().split('T')[0] };

    return this.activitiesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['summary', 'recordName'],
      sortBy: query.sortBy ?? 'scheduledDate',
      sortOrder: query.sortOrder ?? 'ASC',
      where,
      tenantId,
    });
  }

  async findByRecord(tenantId: string, model: string, recordId: string, query: FilterActivityDto) {
    const where = this.buildWhereClause(query);
    where.model = model;
    where.recordId = recordId;

    return this.activitiesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['summary', 'recordName'],
      sortBy: query.sortBy ?? 'scheduledDate',
      sortOrder: query.sortOrder ?? 'ASC',
      where,
      tenantId,
    });
  }

  async findById(tenantId: string, id: string) {
    return this.activitiesRepository.findById(id, { tenantId });
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateActivityDto, auditContext: AuditContext) {
    const activity = await this.activitiesRepository.create(
      {
        model: dto.model,
        recordId: dto.recordId,
        recordName: dto.recordName ?? null,
        activityType: dto.activityType,
        icon: dto.icon ?? null,
        summary: dto.summary,
        note: dto.note ?? null,
        scheduledDate: dto.scheduledDate,
        assignedTo: dto.assignedTo,
        isDone: false,
      } as any,
      { auditContext, tenantId },
    );

    await this.auditService.logCreate(
      tenantId,
      'activities',
      activity.id,
      activity as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    return activity;
  }

  async update(tenantId: string, id: string, dto: UpdateActivityDto, auditContext: AuditContext) {
    const existing = await this.activitiesRepository.findById(id, { tenantId });

    if ((existing as any).isDone) {
      throw new BadRequestException(msg(ErrorMessages.ACTIVITY_ALREADY_DONE, id));
    }

    const before = existing as unknown as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if (dto.model !== undefined) updateData.model = dto.model;
    if (dto.recordId !== undefined) updateData.recordId = dto.recordId;
    if (dto.recordName !== undefined) updateData.recordName = dto.recordName;
    if (dto.activityType !== undefined) updateData.activityType = dto.activityType;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.note !== undefined) updateData.note = dto.note;
    if (dto.scheduledDate !== undefined) updateData.scheduledDate = dto.scheduledDate;
    if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo;

    const updated = await this.activitiesRepository.update(id, updateData as any, {
      auditContext,
      tenantId,
    });

    await this.auditService.logUpdate(
      tenantId,
      'activities',
      id,
      before,
      updated as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    return updated;
  }

  async markDone(
    tenantId: string,
    id: string,
    dto: MarkDoneActivityDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.activitiesRepository.findById(id, { tenantId });

    if ((existing as any).isDone) {
      throw new BadRequestException(msg(ErrorMessages.ACTIVITY_ALREADY_DONE, id));
    }

    const transaction = await this.activitiesRepository.createTransaction();

    try {
      const updated = await this.activitiesRepository.update(
        id,
        {
          isDone: true,
          doneAt: new Date(),
          doneByUserId: auditContext.userId ?? null,
          feedbackNote: dto.feedbackNote ?? null,
        } as any,
        { auditContext, tenantId, transaction },
      );

      await this.outboxSharedService.createEvent(
        transaction,
        tenantId,
        'ACTIVITY_COMPLETED',
        {
          activityId: id,
          model: (existing as any).model,
          recordId: (existing as any).recordId,
          activityType: (existing as any).activityType,
          summary: (existing as any).summary,
          completedBy: auditContext.userId,
          feedbackNote: dto.feedbackNote ?? null,
        },
        id,
        'activity',
      );

      await this.auditService.logStatusChange(
        tenantId,
        'activities',
        id,
        'pending',
        'done',
        auditContext.userId,
      );

      await transaction.commit();

      return updated;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.activitiesRepository.findById(id, { tenantId });

    await this.activitiesRepository.softDelete(id, { auditContext, tenantId });

    await this.auditService.logDelete(
      tenantId,
      'activities',
      id,
      existing as unknown as Record<string, unknown>,
      auditContext.userId,
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildWhereClause(query: FilterActivityDto): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (query.model !== undefined) where.model = query.model;
    if (query.recordId !== undefined) where.recordId = query.recordId;
    if (query.assignedTo !== undefined) where.assignedTo = query.assignedTo;
    if (query.isDone !== undefined) where.isDone = query.isDone;
    if (query.activityType !== undefined) where.activityType = query.activityType;

    if (query.dueBefore || query.dueAfter) {
      const dateFilter: Record<symbol, string> = {};
      if (query.dueBefore) dateFilter[Op.lte as unknown as symbol] = query.dueBefore;
      if (query.dueAfter) dateFilter[Op.gte as unknown as symbol] = query.dueAfter;
      where.scheduledDate = dateFilter;
    }

    return where;
  }
}
