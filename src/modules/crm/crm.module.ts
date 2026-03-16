import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmStage } from '@/database/sql/entities/crm-stage.entity';
import { CrmLead } from '@/database/sql/entities/crm-lead.entity';
import { Activity } from '@/database/sql/entities/activity.entity';
import { CrmStagesRepository } from '@/database/sql/repositories/crm-stages.repository';
import { CrmLeadsRepository } from '@/database/sql/repositories/crm-leads.repository';
import { ActivitiesRepository } from '@/database/sql/repositories/activities.repository';
import { CrmService } from './services/crm.service';
import { CrmStagesController } from './controllers/crm-stages.controller';
import { CrmLeadsController } from './controllers/crm-leads.controller';
import { ActivitiesController } from './controllers/activities.controller';
import { ContactsController } from './controllers/contacts.controller';
import { LeadsController } from './controllers/leads.controller';
import { PipelineController } from './controllers/pipeline.controller';
import { ContactsService } from './services/contacts.service';
import { LeadsService } from './services/leads.service';

@Module({
  imports: [TypeOrmModule.forFeature([CrmStage, CrmLead, Activity])],
  controllers: [
    CrmStagesController,
    CrmLeadsController,
    ActivitiesController,
    ContactsController,
    LeadsController,
    PipelineController,
  ],
  providers: [
    CrmStagesRepository,
    CrmLeadsRepository,
    ActivitiesRepository,
    CrmService,
    ContactsService,
    LeadsService,
  ],
  exports: [CrmService, CrmLeadsRepository],
})
export class CrmModule {}
