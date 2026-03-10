import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { PermissionCacheService } from './permission-cache.service';
import { RolesRepository } from './roles.repository';
import { PermissionsRepository } from './permissions.repository';

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
