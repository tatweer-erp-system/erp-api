import { Module } from '@nestjs/common';
import { ReportingController } from './controllers/reporting.controller';
import { ReportingService } from './services/reporting.service';
import { ReportExportProcessor } from './services/report-export.processor';

@Module({
  controllers: [ReportingController],
  providers: [ReportingService, ReportExportProcessor],
  exports: [ReportingService],
})
export class ReportingModule {}
