import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { LeavesService } from '../services/leaves.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('HR - Leaves')
@Controller('hr/leaves')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get('employee/:employeeId')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get leave requests by employee' })
  @ApiParam({ name: 'employeeId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Paginated list of employee leave requests' })
  getByEmployee(
    @TenantSlug() tenantSlug: string,
    @Param('employeeId') employeeId: string,
    @Query() query: PaginationDto,
  ) {
    return this.leavesService.getByEmployee(tenantSlug, employeeId, query);
  }

  @Get('balance/:employeeId')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get leave balance for employee' })
  @ApiParam({ name: 'employeeId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave balance by type for the current year' })
  getBalance(@TenantSlug() tenantSlug: string, @Param('employeeId') employeeId: string) {
    return this.leavesService.getBalance(tenantSlug, employeeId);
  }

  @Get()
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List all leave requests' })
  @ApiOkResponse({ description: 'Paginated list of leave requests' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.leavesService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get leave request by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request details' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.leavesService.findById(tenantSlug, id);
  }

  @Post()
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new leave request' })
  @ApiCreatedResponse({ description: 'Leave request created' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.create(tenantSlug, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Put(':id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update leave request (only if pending)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request updated' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.update(tenantSlug, id, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/approve')
  @Permissions('hr:approve')
  @ApiOperation({ summary: 'Approve leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request approved' })
  approve(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.approve(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/reject')
  @Permissions('hr:approve')
  @ApiOperation({ summary: 'Reject leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request rejected' })
  reject(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.reject(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/cancel')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request cancelled' })
  cancel(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.cancel(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }
}
