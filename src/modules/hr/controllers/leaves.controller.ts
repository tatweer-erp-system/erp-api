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
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Leaves')
@Controller('leaves')
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
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Query() query: PaginationDto,
  ) {
    return this.leavesService.getByEmployee(tenantId, employeeId, query);
  }

  @Get('balance/:employeeId')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get leave balance for employee' })
  @ApiParam({ name: 'employeeId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave balance by type for the current year' })
  getBalance(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.leavesService.getBalance(tenantId, employeeId);
  }

  @Get()
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List all leave requests' })
  @ApiOkResponse({ description: 'Paginated list of leave requests' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.leavesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get leave request by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leavesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new leave request' })
  @ApiCreatedResponse({ description: 'Leave request created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update leave request (only if pending)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/approve')
  @Permissions('hr:approve')
  @ApiOperation({ summary: 'Approve leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request approved' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.approve(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/reject')
  @Permissions('hr:approve')
  @ApiOperation({ summary: 'Reject leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request rejected' })
  reject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.reject(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/cancel')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request cancelled' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavesService.cancel(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
