import { Module } from '@nestjs/common';
import { CompanySettingsController } from './controllers/company-settings.controller';
import { CompanySettingsService } from './services/company-settings.service';

@Module({
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
