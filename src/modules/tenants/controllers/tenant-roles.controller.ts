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
import { TenantRolesService } from '../services/tenant-roles.service';
import { CreateTenantRoleDto, UpdateTenantRoleDto } from '../dto/tenant-role.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Tenant Roles')
@Controller('tenants/:tenantId/roles')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class TenantRolesController {
  constructor(private readonly tenantRolesService: TenantRolesService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant roles (paginated)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  findAll(@Param('tenantId') tenantId: string, @Query() query: PaginationDto) {
    return this.tenantRolesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant role by ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role details with permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findById(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.tenantRolesService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role for tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantRolesService.create(tenantId, dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tenant role' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'System roles cannot be modified' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenantRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantRolesService.update(tenantId, id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a tenant role' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 400, description: 'System roles cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  remove(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantRolesService.remove(tenantId, id, user.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a tenant role' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Role ID to duplicate' })
  @ApiResponse({ status: 201, description: 'Role duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  duplicate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantRolesService.duplicate(tenantId, id, user.id);
  }
}
