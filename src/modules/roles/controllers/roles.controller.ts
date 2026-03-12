import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { PermissionsService } from '../services/permissions.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // ── Dropdown (before /:id) ────────────────────────────────────────────────

  @Get('dropdown')
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'Get roles dropdown list' })
  @ApiResponse({ status: 200, description: 'Dropdown list of roles' })
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.rolesService.getDropdown(tenantId, query);
  }

  // ── Permissions routes (before /:id) ──────────────────────────────────────

  @Get('permissions')
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({ status: 200, description: 'Paginated list of permissions' })
  listPermissions(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.permissionsService.findAll(tenantId, query);
  }

  // ── Standard CRUD ─────────────────────────────────────────────────────────

  @Get()
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'List all roles (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.rolesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role details with permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.rolesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.create(tenantId, dto, { userId: user.id });
  }

  @Put(':id')
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'System roles cannot be modified' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.update(tenantId, id, dto, { userId: user.id });
  }

  @Delete(':id')
  @Permissions('settings:manage_roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 400, description: 'System roles cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.remove(tenantId, id, { userId: user.id });
  }

  // ── Role permissions management ───────────────────────────────────────────

  @Put(':id/permissions')
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'Set permissions for a role (replaces existing)' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Permissions set successfully' })
  @ApiResponse({ status: 400, description: 'System role permissions cannot be modified' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  assignPermissions(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.rolesService.assignPermissions(tenantId, id, dto.permissionIds);
  }

  @Get(':id/permissions')
  @Permissions('settings:manage_roles')
  @ApiOperation({ summary: 'Get permissions assigned to a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'List of role permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getPermissions(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.rolesService.getPermissions(tenantId, id);
  }
}
