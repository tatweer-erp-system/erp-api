import { Module } from '@nestjs/common';
import { ReportingController } from './controllers/reporting.controller';
import { RevenueController } from './controllers/revenue.controller';
import { ReportingService } from './services/reporting.service';
import { RevenueService } from './services/revenue.service';
import { DashboardService } from './services/dashboard.service';
import { AgingService } from './services/aging.service';
import { ReportExportProcessor } from './services/report-export.processor';

@Module({
  controllers: [ReportingController, RevenueController],
  providers: [
    ReportingService,
    RevenueService,
    DashboardService,
    AgingService,
    ReportExportProcessor,
  ],
  exports: [],
})
export class ReportingModule {}
