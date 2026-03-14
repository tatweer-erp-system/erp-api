import { Global, Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { SystemSettingsService } from './services/settings.service';
import { UnifiedSettingsService } from './services/unified-settings.service';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SystemSettingsService, UnifiedSettingsService],
  exports: [UnifiedSettingsService],
})
export class SettingsModule {}
