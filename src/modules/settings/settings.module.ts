import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { SystemSettingsService } from './services/settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SettingsModule {}
