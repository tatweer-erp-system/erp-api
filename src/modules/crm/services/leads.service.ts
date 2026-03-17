import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { LeadsRepository } from '@/database/sql/repositories/leads.repository';
import { LeadActivitiesRepository } from '@/database/sql/repositories/lead-activities.repository';
import { CrmStagesRepository } from '@/database/sql/repositories/crm-stages.repository';
import { CurrencyService } from '@/modules/currency/currency.service';
import { SalesOrderSharedService } from '@/shared/services/sales-order-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { ActivitiesService } from '@/modules/activities/services/activities.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { ChangeStageDto } from '../dto/transition-lead.dto';
import { LoseLeadDto } from '../dto/lose-lead.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { LeadActivityType, LeadType } from '@/common/enums/crm.enums';
import { ActivityType } from '@/common/enums/activity.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PipelineStage } from '../interfaces/crm.interface';

const LEAD_CLOSING_SOON_DAYS = 3;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly leadsRepository: LeadsRepository,
    private readonly leadActivitiesRepository: LeadActivitiesRepository,
    private readonly crmStagesRepository: CrmStagesRepository,
    private readonly currencyService: CurrencyService,
    private readonly salesOrderSharedService: SalesOrderSharedService,
    private readonly outboxSharedService: OutboxSharedService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.leadsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search,
      sortOrder,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const lead = await this.leadsRepository.findOneById(tenantId, id);
    if (!lead) throw new NotFoundException(msg(ErrorMessages.LEAD_NOT_FOUND, id));

    // Attach CRM timeline
    const activities = await this.leadActivitiesRepository.findByLeadId(tenantId, id);
    lead.activities = activities;

    return lead;
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.leadsRepository.findDropdown(tenantId, { search, limit });
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateLeadDto, auditContext: AuditContext) {
    let expectedRevenueBase: number | null = null;

    // Resolve stage: use provided stageId or find the first stage by sequence
    let stageId = dto.stageId ?? null;
    let probability = dto.probability ?? null;

    if (stageId) {
      const stage = await this.crmStagesRepository.findByIdOrNull(stageId, { tenantId });
      if (!stage) {
        throw new BadRequestException(msg(ErrorMessages.CRM_STAGE_NOT_FOUND, stageId));
      }
      if (probability === null || probability === undefined) {
        probability = Number(stage.probability);
      }
    } else {
      // Auto-assign first stage
      const firstStage = await this.findFirstStage(tenantId);
      if (firstStage) {
        stageId = firstStage.id;
        if (probability === null || probability === undefined) {
          probability = Number(firstStage.probability);
        }
      }
    }

    // Currency conversion for expectedRevenue
    if (dto.expectedRevenue) {
      try {
        const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
        expectedRevenueBase = dto.expectedRevenue;
        // If we had a currencyId we'd convert, but for now assume base
        void baseCurrency;
      } catch {
        expectedRevenueBase = dto.expectedRevenue;
      }
    }

    const id = await this.leadsRepository.insertLead(tenantId, {
      title: dto.titleEn,
      stageId,
      partnerId: dto.partnerId ?? null,
      type: dto.type ?? LeadType.LEAD,
      probability,
      expectedRevenue: dto.expectedRevenue ?? null,
      expectedRevenueBase,
      priority: dto.priority,
      assignedTo: dto.assignedTo ?? null,
      expectedCloseDate: dto.expectedCloseDate ?? null,
      source: dto.source ?? null,
      campaign: dto.campaign ?? null,
      medium: dto.medium ?? null,
      tags: dto.tags ?? null,
      notes: dto.notes ?? null,
      createdBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, auditContext: AuditContext) {
    const lead = await this.leadsRepository.findOneById(tenantId, id);
    if (!lead) throw new NotFoundException(msg(ErrorMessages.LEAD_NOT_FOUND, id));

    // Prevent updates to terminal leads
    if (lead.isWon || lead.isLost) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    // If stageId is changing, handle stage change logic
    if (dto.stageId !== undefined && dto.stageId !== lead.stageId) {
      await this.changeStageInternal(tenantId, id, lead, dto.stageId, auditContext);
    }

    const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.titleEn !== undefined) {
      updates.push('title = :title');
      replacements.title = dto.titleEn;
    }
    if (dto.partnerId !== undefined) {
      updates.push('"partnerId" = :partnerId');
      replacements.partnerId = dto.partnerId;
    }
    if (dto.type !== undefined) {
      updates.push('type = :type');
      replacements.type = dto.type;
    }
    if (dto.assignedTo !== undefined) {
      updates.push('"assignedTo" = :assignedTo');
      replacements.assignedTo = dto.assignedTo;
    }
    if (dto.expectedRevenue !== undefined) {
      updates.push('"expectedRevenue" = :expectedRevenue');
      replacements.expectedRevenue = dto.expectedRevenue;
      updates.push('"expectedRevenueBase" = :expectedRevenueBase');
      replacements.expectedRevenueBase = dto.expectedRevenue;
    }
    if (dto.priority !== undefined) {
      updates.push('priority = :priority');
      replacements.priority = dto.priority;
    }
    if (dto.source !== undefined) {
      updates.push('source = :source');
      replacements.source = dto.source;
    }
    if (dto.campaign !== undefined) {
      updates.push('campaign = :campaign');
      replacements.campaign = dto.campaign;
    }
    if (dto.medium !== undefined) {
      updates.push('medium = :medium');
      replacements.medium = dto.medium;
    }
    if (dto.expectedCloseDate !== undefined) {
      updates.push('"expectedCloseDate" = :expectedCloseDate');
      replacements.expectedCloseDate = dto.expectedCloseDate;
    }
    if (dto.tags !== undefined) {
      updates.push('tags = :tags');
      replacements.tags = dto.tags;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }
    if (dto.probability !== undefined && dto.stageId === undefined) {
      // Only override probability manually if not changing stage
      updates.push('probability = :probability');
      replacements.probability = dto.probability;
    }

    await this.leadsRepository.updateLead(tenantId, id, updates, replacements);

    return this.findById(tenantId, id);
  }

  async changeStage(tenantId: string, id: string, dto: ChangeStageDto, auditContext: AuditContext) {
    const lead = await this.leadsRepository.findOneById(tenantId, id);
    if (!lead) throw new NotFoundException(msg(ErrorMessages.LEAD_NOT_FOUND, id));

    if (lead.isWon || lead.isLost) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    await this.changeStageInternal(tenantId, id, lead, dto.stageId, auditContext);

    return this.findById(tenantId, id);
  }

  async convert(tenantId: string, id: string, auditContext: AuditContext) {
    const lead = await this.leadsRepository.findOneById(tenantId, id);
    if (!lead) throw new NotFoundException(msg(ErrorMessages.LEAD_NOT_FOUND, id));

    if (lead.isWon || lead.isLost) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    if (lead.type === LeadType.OPPORTUNITY) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CONVERTED, id));
    }

    await this.leadsRepository.convertToOpportunity(tenantId, id, auditContext.userId ?? null);

    // Log CRM activity
    await this.leadActivitiesRepository.insertActivity(tenantId, {
      leadId: id,
      userId: auditContext.userId!,
      activityType: LeadActivityType.CONVERTED,
      notes: 'Converted from lead to opportunity',
      createdBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
  }

  async win(tenantId: string, id: string, auditContext: AuditContext) {
    const lead = await this.leadsRepository.findOneById(tenantId, id);
    if (!lead) throw new NotFoundException(msg(ErrorMessages.LEAD_NOT_FOUND, id));

    if (lead.isWon || lead.isLost) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    // Find the winning stage (isWon=true)
    const wonStage = await this.findWonStage(tenantId);
    const wonStageId = wonStage?.id ?? lead.stageId;

    const fromStageId = lead.stageId;
    await this.leadsRepository.winLead(tenantId, id, wonStageId, auditContext.userId ?? null);

    // Log CRM activity
    await this.leadActivitiesRepository.insertActivity(tenantId, {
      leadId: id,
      userId: auditContext.userId!,
      activityType: LeadActivityType.WON,
      fromStageId,
      toStageId: wonStageId,
      notes: null,
      createdBy: auditContext.userId ?? null,
    });

    // Create draft sales order from won lead
    try {
      const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
      const salesOrder = await this.salesOrderSharedService.createFromLead(
        tenantId,
        {
          partnerId: lead.partnerId,
          currencyId: lead.currencyId ?? baseCurrency.id,
          notes: `Created from lead: ${lead.title ?? id}`,
          branchId: auditContext.tenantId ?? tenantId,
        },
        auditContext,
      );

      // Store SO reference on lead
      await this.leadsRepository.setSaleOrderId(tenantId, id, salesOrder.id);
    } catch (err) {
      this.logger.error(
        `Failed to create sales order from lead ${id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    return this.findById(tenantId, id);
  }

  async lose(tenantId: string, id: string, dto: LoseLeadDto, auditContext: AuditContext) {
    const lead = await this.leadsRepository.findOneById(tenantId, id);
    if (!lead) throw new NotFoundException(msg(ErrorMessages.LEAD_NOT_FOUND, id));

    if (lead.isWon || lead.isLost) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    const fromStageId = lead.stageId;
    await this.leadsRepository.loseLead(tenantId, id, dto.reason, auditContext.userId ?? null);

    // Log CRM activity
    await this.leadActivitiesRepository.insertActivity(tenantId, {
      leadId: id,
      userId: auditContext.userId!,
      activityType: LeadActivityType.LOST,
      fromStageId,
      notes: dto.reason,
      createdBy: auditContext.userId ?? null,
    });

    // Create outbox event for lead lost
    try {
      const sequelize = await (this.leadsRepository as any).getSequelizeInstance?.(tenantId);
      if (sequelize) {
        const transaction = await sequelize.transaction();
        try {
          await this.outboxSharedService.createEvent(
            transaction,
            tenantId,
            'LEAD_LOST',
            {
              leadId: id,
              title: lead.title,
              lostReason: dto.reason,
              partnerId: lead.partnerId,
              assignedTo: lead.assignedTo,
            },
            id,
            'lead',
          );
          await transaction.commit();
        } catch (e) {
          await transaction.rollback();
          throw e;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to create outbox event for lost lead ${id}: ${(err as Error).message}`,
      );
    }

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    const lead = await this.leadsRepository.findOneById(tenantId, id);
    if (!lead) throw new NotFoundException(msg(ErrorMessages.LEAD_NOT_FOUND, id));
    await this.leadsRepository.softDeleteLead(tenantId, id, auditContext.userId ?? null);
  }

  // ── Pipeline & Reports ─────────────────────────────────────────────────────

  async getPipeline(tenantId: string) {
    const { stages, leads } = await this.leadsRepository.getPipelineByStage(tenantId);

    // Group leads by stageId
    const pipeline: PipelineStage[] = stages.map((stage: any) => ({
      stageId: stage.stageId,
      nameEn: stage.nameEn,
      nameAr: stage.nameAr,
      sequence: stage.sequence,
      stageProbability: parseFloat(String(stage.stageProbability)),
      isWon: stage.isWon,
      isFolded: stage.isFolded,
      count: parseInt(String(stage.count), 10),
      totalValue: parseFloat(String(stage.totalValue)),
      leads: [],
    }));

    // Index stages by id for quick lookup
    const stageMap = new Map<string, PipelineStage>();
    for (const stage of pipeline) {
      stageMap.set(stage.stageId, stage);
    }

    // Distribute leads into their stage buckets
    for (const lead of leads) {
      const stage = stageMap.get(lead.stageId);
      if (stage) {
        stage.leads.push(lead);
      }
    }

    return pipeline;
  }

  async getConversionReport(tenantId: string) {
    const { overall, byAssignee } = await this.leadsRepository.getConversionReport(tenantId);

    const wonCount = parseInt(String(overall.wonCount), 10);
    const lostCount = parseInt(String(overall.lostCount), 10);
    const totalDecided = wonCount + lostCount;
    const winRate = totalDecided > 0 ? Math.round((wonCount / totalDecided) * 10000) / 100 : 0;

    const breakdown = byAssignee.map((row: any) => {
      const rWon = parseInt(String(row.wonCount), 10);
      const rLost = parseInt(String(row.lostCount), 10);
      const rTotal = rWon + rLost;
      return {
        assignedTo: row.assignedTo,
        wonCount: rWon,
        lostCount: rLost,
        winRate: rTotal > 0 ? Math.round((rWon / rTotal) * 10000) / 100 : 0,
        avgDealSize: parseFloat(String(row.avgDealSize)),
        avgDaysToClose: parseFloat(String(row.avgDaysToClose)),
      };
    });

    return {
      winRate,
      wonCount,
      lostCount,
      avgDealSize: parseFloat(String(overall.avgDealSize)),
      avgDaysToClose: parseFloat(String(overall.avgDaysToClose)),
      byAssignee: breakdown,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async changeStageInternal(
    tenantId: string,
    leadId: string,
    lead: any,
    targetStageId: string,
    auditContext: AuditContext,
  ) {
    const targetStage = await this.crmStagesRepository.findByIdOrNull(targetStageId, { tenantId });
    if (!targetStage) {
      throw new BadRequestException(msg(ErrorMessages.CRM_STAGE_NOT_FOUND, targetStageId));
    }

    const fromStageId = lead.stageId;
    const probability = Number(targetStage.probability);

    await this.leadsRepository.changeStage(tenantId, leadId, {
      stageId: targetStageId,
      probability,
      updatedBy: auditContext.userId ?? null,
    });

    // Log CRM activity
    await this.leadActivitiesRepository.insertActivity(tenantId, {
      leadId,
      userId: auditContext.userId!,
      activityType: LeadActivityType.STAGE_CHANGE,
      fromStageId,
      toStageId: targetStageId,
      notes: null,
      createdBy: auditContext.userId ?? null,
    });

    // Also create a universal activity for cross-module tracking
    try {
      await this.activitiesService.create(
        tenantId,
        {
          model: 'leads',
          recordId: leadId,
          recordName: lead.title,
          activityType: ActivityType.TODO,
          summary: `Stage changed from ${lead.stageNameEn ?? 'unknown'} to ${targetStage.nameEn}`,
          scheduledDate: new Date().toISOString().split('T')[0],
          assignedTo: lead.assignedTo ?? auditContext.userId!,
        },
        auditContext,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to create universal activity for stage change on lead ${leadId}: ${(err as Error).message}`,
      );
    }
  }

  private async findFirstStage(tenantId: string) {
    const result = await this.crmStagesRepository.findAll({
      tenantId,
      page: 1,
      limit: 1,
      sortBy: 'sequence',
      sortOrder: 'ASC',
    });
    return result.data?.[0] ?? null;
  }

  private async findWonStage(tenantId: string) {
    const result = await this.crmStagesRepository.findAll({
      tenantId,
      page: 1,
      limit: 1,
      where: { isWon: true },
      sortBy: 'sequence',
      sortOrder: 'ASC',
    });
    return result.data?.[0] ?? null;
  }
}
