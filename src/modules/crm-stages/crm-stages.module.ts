import { Module } from '@nestjs/common';
import { CrmStagesController } from './controllers/crm-stages.controller';
import { CrmStagesService } from './services/crm-stages.service';

@Module({
  controllers: [CrmStagesController],
  providers: [CrmStagesService],
  exports: [CrmStagesService],
})
export class CrmStagesModule {}
