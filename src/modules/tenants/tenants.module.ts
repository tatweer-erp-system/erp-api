import { Module } from '@nestjs/common';
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
import { SequencesModule } from '../sequences/sequences.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [SequencesModule, RolesModule],
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
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
