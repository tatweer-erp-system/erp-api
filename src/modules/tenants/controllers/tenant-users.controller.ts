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
import { TenantUsersService } from '../services/tenant-users.service';
import {
  CreateTenantUserDto,
  UpdateTenantUserDto,
  PermissionOverrideDto,
} from '../dto/tenant-user.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Tenant Users')
@Controller('tenants/:tenantId/users')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class TenantUsersController {
  constructor(private readonly tenantUsersService: TenantUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant users (paginated)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(@Param('tenantId') tenantId: string, @Query() query: PaginationDto) {
    return this.tenantUsersService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant user by ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findById(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.tenantUsersService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user for tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantUsersService.create(tenantId, dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tenant user' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantUsersService.update(tenantId, id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a tenant user' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantUsersService.remove(tenantId, id, user.id);
  }

  @Post(':userId/reset-password')
  @ApiOperation({ summary: 'Reset tenant user password' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Password reset, temporary password returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resetPassword(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.tenantUsersService.resetPassword(tenantId, userId);
  }

  @Post(':userId/force-logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force logout a tenant user (revoke all sessions)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'All sessions revoked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  forceLogout(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.tenantUsersService.forceLogout(tenantId, userId);
  }

  @Post(':userId/permission-overrides')
  @ApiOperation({ summary: 'Add a permission override for a tenant user' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, description: 'Permission override added' })
  @ApiResponse({ status: 404, description: 'User not found' })
  addPermissionOverride(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: PermissionOverrideDto,
  ) {
    return this.tenantUsersService.addPermissionOverride(tenantId, userId, dto);
  }

  @Delete(':userId/permission-overrides/:overrideId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a permission override from a tenant user' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({
    name: 'overrideId',
    description: 'Override ID (format: grant:module:action or revoke:module:action)',
  })
  @ApiResponse({ status: 204, description: 'Permission override removed' })
  @ApiResponse({ status: 404, description: 'User or override not found' })
  removePermissionOverride(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Param('overrideId') overrideId: string,
  ) {
    return this.tenantUsersService.removePermissionOverride(tenantId, userId, overrideId);
  }
}
