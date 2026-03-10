import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Tenant } from '../../database/entities/tenant.entity';
import { TenantsController } from './controllers/tenants.controller';
import { TenantsService } from './services/tenants.service';
import { TenantsRepository } from '../../database/repositories/tenants.repository';
import { TenantProvisionerService } from './services/tenant-provisioner.service';

@Module({
  imports: [SequelizeModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository, TenantProvisionerService],
  exports: [TenantsService, TenantsRepository],
})
export class TenantsModule {}
