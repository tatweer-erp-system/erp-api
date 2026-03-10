import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReportingController } from './controllers/reporting.controller';
import { ReportingService } from './services/reporting.service';
import { ReportExportProcessor } from './services/report-export.processor';
import { QUEUE_REPORTS } from '../../infrastructure/queues/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_REPORTS })],
  controllers: [ReportingController],
  providers: [ReportingService, ReportExportProcessor],
  exports: [ReportingService],
})
export class ReportingModule {}
