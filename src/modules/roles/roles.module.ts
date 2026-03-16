import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '@/database/sql/entities/role.entity';
import { Permission } from '@/database/sql/entities/permission.entity';
import { RolePermission } from '@/database/sql/entities/role-permission.entity';
import { UserRole } from '@/database/sql/entities/user-role.entity';
import { RolesRepository } from '@/database/sql/repositories/roles.repository';
import { PermissionsRepository } from '@/database/sql/repositories/permissions.repository';
import { RolesService } from './services/roles.service';
import { RolesController } from './controllers/roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, UserRole])],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository, PermissionsRepository],
  exports: [RolesService, RolesRepository, PermissionsRepository],
})
export class RolesModule {}
