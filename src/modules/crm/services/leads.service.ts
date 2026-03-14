import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LeadsRepository } from '@/database/sql/repositories/leads.repository';
import { LeadActivitiesRepository } from '@/database/sql/repositories/lead-activities.repository';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { TransitionLeadDto } from '../dto/transition-lead.dto';
import { LoseLeadDto } from '../dto/lose-lead.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { LeadStatus, LeadActivityType } from '@/common/enums/crm.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

const LEAD_CLOSING_SOON_DAYS = 3;

@Injectable()
export class LeadsService {
  constructor(
    private readonly leadsRepository: LeadsRepository,
    private readonly leadActivitiesRepository: LeadActivitiesRepository,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly currencyService: CurrencyService,
  ) {}

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
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(tenantId: string, dto: CreateLeadDto, auditContext: AuditContext) {
    let currencyId: string | null = null;
    let valueBase: number | null = null;

    // If a currencyId is provided and value exists, compute valueBase
    if ((dto as any).currencyId && dto.estimatedValue) {
      currencyId = (dto as any).currencyId;
      const converted = await this.currencyService.toBase(
        tenantId,
        dto.estimatedValue,
        currencyId!,
      );
      valueBase = converted.amount;
    } else if (dto.estimatedValue) {
      valueBase = dto.estimatedValue;
    }

    const id = await this.leadsRepository.insertLead(tenantId, {
      title: dto.titleEn,
      contactId: dto.contactId ?? null,
      value: dto.estimatedValue ?? null,
      currencyId,
      valueBase,
      assignedTo: dto.assignedTo ?? null,
      notes: dto.notes ?? null,
      createdBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, auditContext: AuditContext) {
    const lead = await this.findById(tenantId, id);

    // Prevent updates to terminal leads
    if (lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
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
    if (dto.contactId !== undefined) {
      updates.push('"contactId" = :contactId');
      replacements.contactId = dto.contactId;
    }
    if (dto.assignedTo !== undefined) {
      updates.push('"assignedTo" = :assignedTo');
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

    await this.leadsRepository.updateLead(tenantId, id, updates, replacements);

    return this.findById(tenantId, id);
  }

  async transition(
    tenantId: string,
    id: string,
    dto: TransitionLeadDto,
    auditContext: AuditContext,
  ) {
    const lead = await this.findById(tenantId, id);
    const currentStatus = lead.status;

    // Cannot transition from terminal statuses
    if (currentStatus === LeadStatus.WON || currentStatus === LeadStatus.LOST) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    // Validate transition
    this.statusTransitionService.validateOrThrow('lead', currentStatus, dto.status);

    await this.leadsRepository.transitionStatus(tenantId, id, {
      status: dto.status,
      reason: dto.reason ?? null,
      updatedBy: auditContext.userId ?? null,
    });

    // Log activity
    await this.leadActivitiesRepository.insertActivity(tenantId, {
      leadId: id,
      userId: auditContext.userId!,
      activityType: LeadActivityType.STATUS_CHANGE,
      fromStatus: currentStatus,
      toStatus: dto.status,
      notes: dto.reason ?? null,
      createdBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
  }

  async win(tenantId: string, id: string, auditContext: AuditContext) {
    const lead = await this.findById(tenantId, id);

    if (lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    const fromStatus = lead.status;
    await this.leadsRepository.winLead(tenantId, id, auditContext.userId ?? null);

    // Log activity
    await this.leadActivitiesRepository.insertActivity(tenantId, {
      leadId: id,
      userId: auditContext.userId!,
      activityType: LeadActivityType.STATUS_CHANGE,
      fromStatus,
      toStatus: LeadStatus.WON,
      notes: null,
      createdBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
  }

  async lose(tenantId: string, id: string, dto: LoseLeadDto, auditContext: AuditContext) {
    const lead = await this.findById(tenantId, id);

    if (lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST) {
      throw new BadRequestException(msg(ErrorMessages.LEAD_ALREADY_CLOSED, id));
    }

    const fromStatus = lead.status;
    await this.leadsRepository.loseLead(tenantId, id, dto.reason, auditContext.userId ?? null);

    // Log activity
    await this.leadActivitiesRepository.insertActivity(tenantId, {
      leadId: id,
      userId: auditContext.userId!,
      activityType: LeadActivityType.STATUS_CHANGE,
      fromStatus,
      toStatus: LeadStatus.LOST,
      notes: dto.reason,
      createdBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
  }

  async getPipeline(tenantId: string) {
    const { summary, leads } = await this.leadsRepository.getPipeline(tenantId);

    // Group leads by status
    const pipeline: Record<string, { count: number; totalValue: number; leads: any[] }> = {};

    // Initialize all statuses
    for (const status of Object.values(LeadStatus)) {
      pipeline[status] = { count: 0, totalValue: 0, leads: [] };
    }

    // Fill in summary data
    for (const row of summary) {
      if (pipeline[row.status]) {
        pipeline[row.status].count = parseInt(String(row.count), 10);
        pipeline[row.status].totalValue = parseFloat(String(row.totalValue));
      }
    }

    // Group leads into their status buckets
    for (const lead of leads) {
      if (pipeline[lead.status]) {
        pipeline[lead.status].leads.push(lead);
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

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.findById(tenantId, id);
    await this.leadsRepository.softDeleteLead(tenantId, id, auditContext.userId ?? null);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 50 } = query;
    return this.leadsRepository.findDropdown(tenantId, { search, limit });
  }
}
