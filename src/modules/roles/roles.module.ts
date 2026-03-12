import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { PermissionCacheService } from './services/permission-cache.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PermissionsService, PermissionCacheService],
  exports: [RolesService, PermissionsService, PermissionCacheService],
})
export class RolesModule {}
