import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PermissionsService],
  exports: [],
})
export class RolesModule {}
