import { Module } from '@nestjs/common';
import { TenantConfigController } from './controllers/tenant-config.controller';
import { TenantConfigService } from './services/tenant-config.service';

@Module({
  controllers: [TenantConfigController],
  providers: [TenantConfigService],
})
export class TenantConfigModule {}
