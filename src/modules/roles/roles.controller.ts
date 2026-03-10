import { Controller, Get, Post, Body, Param, UseGuards, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @Permissions('roles:list')
  @ApiOperation({ summary: 'List all roles' })
  findAll(@TenantSlug() tenantSlug: string) {
    return this.rolesService.findAll(tenantSlug);
  }

  @Post()
  @Permissions('roles:create')
  @ApiOperation({ summary: 'Create a role' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.create(tenantSlug, dto, user.id);
  }

  @Get('permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all permissions' })
  listPermissions(@TenantSlug() tenantSlug: string) {
    return this.permissionsService.findAll(tenantSlug);
  }

  @Get(':id/permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Get permissions for a role' })
  getRolePermissions(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.permissionsService.findByRole(tenantSlug, id);
  }

  @Put(':id/permissions')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  assignPermissions(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.rolesService.assignPermissions(tenantSlug, id, dto);
  }

  @Post(':roleId/users/:userId')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Assign role to user' })
  assignToUser(
    @TenantSlug() tenantSlug: string,
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.assignRoleToUser(tenantSlug, userId, roleId);
  }

  @Delete(':roleId/users/:userId')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Remove role from user' })
  removeFromUser(
    @TenantSlug() tenantSlug: string,
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.removeRoleFromUser(tenantSlug, userId, roleId);
  }
}
