import { Module } from '@nestjs/common';
import { ReportingController } from './controllers/reporting.controller';
import { RevenueController } from './controllers/revenue.controller';
import { ReportingService } from './services/reporting.service';
import { RevenueService } from './services/revenue.service';
import { ReportExportProcessor } from './services/report-export.processor';

@Module({
  controllers: [ReportingController, RevenueController],
  providers: [ReportingService, RevenueService, ReportExportProcessor],
  exports: [],
})
export class ReportingModule {}
