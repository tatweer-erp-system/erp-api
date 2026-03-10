import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { RolesRepository } from '../../database/repositories/roles.repository';
import { PermissionsRepository } from '../../database/repositories/permissions.repository';

@Module({
  controllers: [RolesController],
  providers: [
    RolesService,
    PermissionsService,
    PermissionCacheService,
    RolesRepository,
    PermissionsRepository,
  ],
  exports: [
    RolesService,
    PermissionsService,
    PermissionCacheService,
    RolesRepository,
    PermissionsRepository,
  ],
})
export class RolesModule {}
