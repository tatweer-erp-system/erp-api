import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { TenantSlug } from '@/common/decorators/tenant.decorator';
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
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Get roles dropdown list' })
  @ApiResponse({ status: 200, description: 'Dropdown list of roles' })
  getDropdown(@TenantSlug() tenantSlug: string, @Query() query: DropdownQueryDto) {
    return this.rolesService.getDropdown(tenantSlug, query);
  }

  // ── Permissions routes (before /:id) ──────────────────────────────────────

  @Get('permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({ status: 200, description: 'Paginated list of permissions' })
  listPermissions(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.permissionsService.findAll(tenantSlug, query);
  }

  // ── Standard CRUD ─────────────────────────────────────────────────────────

  @Get()
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all roles (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.rolesService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role details with permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.rolesService.findById(tenantSlug, id);
  }

  @Post()
  @Permissions('roles:create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.create(tenantSlug, dto, { userId: user.id });
  }

  @Put(':id')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'System roles cannot be modified' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.update(tenantSlug, id, dto, { userId: user.id });
  }

  @Delete(':id')
  @Permissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 400, description: 'System roles cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  remove(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.remove(tenantSlug, id, { userId: user.id });
  }

  // ── Role permissions management ───────────────────────────────────────────

  @Patch(':id/permissions')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 400, description: 'System role permissions cannot be modified' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  assignPermissions(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.rolesService.assignPermissions(tenantSlug, id, dto.permissionIds);
  }

  @Get(':id/permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Get permissions assigned to a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'List of role permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getPermissions(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.rolesService.getPermissions(tenantSlug, id);
  }
}
