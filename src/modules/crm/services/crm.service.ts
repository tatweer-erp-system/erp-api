import { Injectable } from '@nestjs/common';
import { CrmStagesRepository } from '@/database/sql/repositories/crm-stages.repository';
import { CrmLeadsRepository } from '@/database/sql/repositories/crm-leads.repository';
import { ActivitiesRepository } from '@/database/sql/repositories/activities.repository';
import { CrmStage } from '@/database/sql/entities/crm-stage.entity';
import { CrmLead } from '@/database/sql/entities/crm-lead.entity';
import { Activity } from '@/database/sql/entities/activity.entity';
import { CrmStageType, CrmLeadStatus } from '@/common/enums/crm.enums';

@Injectable()
export class CrmService {
  constructor(
    private readonly stagesRepo: CrmStagesRepository,
    private readonly leadsRepo: CrmLeadsRepository,
    private readonly activitiesRepo: ActivitiesRepository,
  ) {}

  // ─── Stages ──────────────────────────────────────────────────────────────────

  findAllStages(stageType?: CrmStageType, isActive?: boolean) {
    return this.stagesRepo.findAll(stageType, isActive);
  }

  findStageById(id: string): Promise<CrmStage> {
    return this.stagesRepo.findById(id);
  }

  createStage(data: Partial<CrmStage>): Promise<CrmStage> {
    return this.stagesRepo.create(data);
  }

  updateStage(id: string, version: number, data: Partial<CrmStage>): Promise<CrmStage> {
    return this.stagesRepo.update(id, version, data);
  }

  removeStage(id: string): Promise<void> {
    return this.stagesRepo.softDelete(id);
  }

  stagesDropdown() {
    return this.stagesRepo.findForDropdown();
  }

  // ─── Leads ───────────────────────────────────────────────────────────────────

  findAllLeads(
    branchId: string,
    filters: {
      status?: CrmLeadStatus;
      stageId?: string;
      assignedTo?: string;
      search?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    return this.leadsRepo.findAll(branchId, filters, page, limit);
  }

  findLeadById(id: string): Promise<CrmLead> {
    return this.leadsRepo.findById(id);
  }

  createLead(data: Partial<CrmLead>): Promise<CrmLead> {
    return this.leadsRepo.create(data);
  }

  updateLead(id: string, version: number, data: Partial<CrmLead>): Promise<CrmLead> {
    return this.leadsRepo.update(id, version, data);
  }

  markWon(id: string): Promise<CrmLead> {
    return this.leadsRepo.markWon(id);
  }

  markLost(id: string, lossReason: string): Promise<CrmLead> {
    return this.leadsRepo.markLost(id, lossReason);
  }

  moveToStage(id: string, stageId: string): Promise<CrmLead> {
    return this.leadsRepo.moveToStage(id, stageId);
  }

  removeLead(id: string): Promise<void> {
    return this.leadsRepo.softDelete(id);
  }

  // ─── Activities ───────────────────────────────────────────────────────────────

  findActivitiesByRecord(recordModel: string, recordId: string, page = 1, limit = 20) {
    return this.activitiesRepo.findByRecord(recordModel, recordId, page, limit);
  }

  findActivityById(id: string): Promise<Activity> {
    return this.activitiesRepo.findById(id);
  }

  findDueActivities(assignedTo: string, date?: string) {
    return this.activitiesRepo.findDue(assignedTo, date);
  }

  createActivity(data: Partial<Activity>): Promise<Activity> {
    return this.activitiesRepo.create(data);
  }

  completeActivity(id: string, completedById: string): Promise<Activity> {
    return this.activitiesRepo.complete(id, completedById);
  }

  removeActivity(id: string): Promise<void> {
    return this.activitiesRepo.softDelete(id);
  }
}
