import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@/database/sql/entities/tenant.entity';
import { TenantNote } from '@/database/sql/entities/tenant-note.entity';
import { Subscription } from '@/database/sql/entities/subscription.entity';
import { Plan } from '@/database/sql/entities/plan.entity';
import { TenantsRepository } from '@/database/sql/repositories/tenants.repository';
import { TenantNotesRepository } from '@/database/sql/repositories/tenant-notes.repository';
import { SubscriptionsRepository } from '@/database/sql/repositories/subscriptions.repository';
import { PlansRepository } from '@/database/sql/repositories/plans.repository';
import { TenantsController } from './controllers/tenants.controller';
import { TenantBranchesController } from './controllers/tenant-branches.controller';
import { TenantNotesController } from './controllers/tenant-notes.controller';
import { TenantRolesController } from './controllers/tenant-roles.controller';
import { TenantSettingsController } from './controllers/tenant-settings.controller';
import { TenantUsersController } from './controllers/tenant-users.controller';
import { TenantsService } from './services/tenants.service';
import { TenantProvisionerService } from './services/tenant-provisioner.service';
import { TenantBranchesService } from './services/tenant-branches.service';
import { TenantNotesService } from './services/tenant-notes.service';
import { TenantRolesService } from './services/tenant-roles.service';
import { TenantSettingsService } from './services/tenant-settings.service';
import { TenantApiKeysService } from './services/tenant-api-keys.service';
import { TenantUsersService } from './services/tenant-users.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantNote, Subscription, Plan])],
  controllers: [
    TenantsController,
    TenantBranchesController,
    TenantNotesController,
    TenantRolesController,
    TenantSettingsController,
    TenantUsersController,
  ],
  providers: [
    TenantsService,
    TenantProvisionerService,
    TenantBranchesService,
    TenantNotesService,
    TenantRolesService,
    TenantSettingsService,
    TenantApiKeysService,
    TenantUsersService,
    SequencesService,
    TenantsRepository,
    TenantNotesRepository,
    SubscriptionsRepository,
    PlansRepository,
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
