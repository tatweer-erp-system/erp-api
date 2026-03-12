import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadsRepository } from '@/database/sql/repositories/leads.repository';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { TransitionLeadDto } from '../dto/transition-lead.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class LeadsService {
  constructor(
    private readonly leadsRepository: LeadsRepository,
    private readonly statusTransitionService: StatusTransitionSharedService,
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
    const id = await this.leadsRepository.insertLead(tenantId, {
      title: dto.title_en,
      contactId: dto.contactId ?? null,
      value: dto.estimatedValue ?? null,
      assignedTo: dto.assignedTo ?? null,
      notes: dto.notes ?? null,
      createdBy: auditContext.userId ?? null,
    });
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, auditContext: AuditContext) {
    await this.findById(tenantId, id);

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

    // Validate transition
    this.statusTransitionService.validateOrThrow('lead', currentStatus, dto.status);

    await this.leadsRepository.transitionStatus(tenantId, id, {
      status: dto.status,
      reason: dto.reason ?? null,
      updatedBy: auditContext.userId ?? null,
    });

    return this.findById(tenantId, id);
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
