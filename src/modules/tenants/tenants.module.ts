import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantProvisionerService } from './tenant-provisioner.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantProvisionerService],
  exports: [TenantsService],
})
export class TenantsModule {}
