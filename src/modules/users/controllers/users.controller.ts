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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CreateConsentDto } from '../dto/consent.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Dropdown (before /:id) ────────────────────────────────────────────────

  @Get('dropdown')
  @ApiOperation({ summary: 'Get users dropdown list' })
  @ApiResponse({ status: 200, description: 'Dropdown list of active users' })
  getDropdown(@TenantSlug() tenantSlug: string, @Query() query: DropdownQueryDto) {
    return this.usersService.getDropdown(tenantSlug, query);
  }

  // ── Current user profile & PDPL (before /:id) ────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  getMe(@TenantSlug() tenantSlug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(tenantSlug, user.id);
  }

  @Post('me/data-export')
  @ApiOperation({ summary: 'Export personal data (PDPL)' })
  @ApiResponse({ status: 200, description: 'Data export download URL' })
  exportMyData(@TenantSlug() tenantSlug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.exportMyData(tenantSlug, user.id);
  }

  @Post('me/erasure-request')
  @ApiOperation({ summary: 'Request personal data erasure (PDPL)' })
  @ApiResponse({ status: 201, description: 'Erasure request submitted' })
  @ApiResponse({ status: 409, description: 'Pending request already exists' })
  requestErasure(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { reason?: string },
  ) {
    return this.usersService.requestErasure(tenantSlug, user.id, body?.reason);
  }

  @Get('me/consents')
  @ApiOperation({ summary: 'Get my consent records (PDPL)' })
  @ApiResponse({ status: 200, description: 'List of consent records' })
  getMyConsents(@TenantSlug() tenantSlug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyConsents(tenantSlug, user.id);
  }

  @Post('me/consents')
  @ApiOperation({ summary: 'Record a consent (PDPL)' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  recordConsent(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConsentDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';
    const userAgent = req.headers['user-agent'] || '';
    return this.usersService.recordConsent(tenantSlug, user.id, dto, ip, userAgent);
  }

  @Delete('me/consents/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a consent (PDPL)' })
  @ApiParam({ name: 'type', description: 'Consent type', example: 'marketing_email' })
  @ApiResponse({ status: 200, description: 'Consent revoked' })
  revokeConsent(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') consentType: string,
  ) {
    return this.usersService.revokeConsent(tenantSlug, user.id, consentType);
  }

  // ── Standard CRUD ─────────────────────────────────────────────────────────

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.usersService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.usersService.findById(tenantSlug, id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('users:create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.create(tenantSlug, dto, { userId: user.id });
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('users:update')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(tenantSlug, id, dto, { userId: user.id });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.remove(tenantSlug, id, { userId: user.id });
  }

  @Patch(':id/restore')
  @UseGuards(PermissionsGuard)
  @Permissions('users:update')
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User restored' })
  @ApiResponse({ status: 404, description: 'Deleted user not found' })
  restore(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.restore(tenantSlug, id, { userId: user.id });
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password or passwords do not match' })
  changePassword(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(tenantSlug, id, dto);
  }

  @Patch(':id/roles')
  @UseGuards(PermissionsGuard)
  @Permissions('users:update')
  @ApiOperation({ summary: 'Assign roles to a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  assignRoles(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() body: { roleIds: string[] },
  ) {
    return this.usersService.assignRoles(tenantSlug, id, body.roleIds);
  }
}
