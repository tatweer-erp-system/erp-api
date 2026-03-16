import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@/database/sql/entities/tenant.entity';
import { TenantConfigController } from './controllers/tenant-config.controller';
import { TenantConfigService } from './services/tenant-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantConfigController],
  providers: [TenantConfigService],
})
export class TenantConfigModule {}
