import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Tenant } from '../../database/entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';
import { TenantProvisionerService } from './tenant-provisioner.service';

@Module({
  imports: [SequelizeModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository, TenantProvisionerService],
  exports: [TenantsService, TenantsRepository],
})
export class TenantsModule {}
