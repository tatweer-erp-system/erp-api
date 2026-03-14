import { Module } from '@nestjs/common';
import { ContactsController } from './controllers/contacts.controller';
import { ContactsService } from './services/contacts.service';
import { LeadsController } from './controllers/leads.controller';
import { LeadsService } from './services/leads.service';
import { PipelineController } from './controllers/pipeline.controller';

@Module({
  controllers: [ContactsController, LeadsController, PipelineController],
  providers: [ContactsService, LeadsService],
})
export class CrmModule {}
