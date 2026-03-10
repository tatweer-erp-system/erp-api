import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('HR - Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr/leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get()
  @Permissions('hr:list')
  findAll(@TenantSlug() tenantSlug: string, @Query() pagination: PaginationDto) {
    return this.leavesService.findAll(tenantSlug, pagination);
  }

  @Get(':id')
  @Permissions('hr:read')
  findOne(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.leavesService.findOne(tenantSlug, id);
  }

  @Post()
  @Permissions('hr:create')
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.create(tenantSlug, dto, user.id);
  }

  @Patch(':id/approve')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Approve leave request' })
  approve(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.approve(tenantSlug, id, user.id);
  }

  @Patch(':id/reject')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Reject leave request' })
  reject(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.leavesService.reject(tenantSlug, id, user.id, reason);
  }
}
