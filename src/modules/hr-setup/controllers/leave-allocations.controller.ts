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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { LeaveAllocationsService } from '../services/leave-allocations.service';
import { CreateLeaveAllocationDto } from '../dto/create-leave-allocation.dto';
import { UpdateLeaveAllocationDto } from '../dto/update-leave-allocation.dto';

@ApiTags('Leave Allocations')
@Controller('hr-setup/leave-allocations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LeaveAllocationsController {
  constructor(private readonly leaveAllocationsService: LeaveAllocationsService) {}

  @Get()
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all leave allocations' })
  @ApiOkResponse({ description: 'Paginated list of leave allocations' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.leaveAllocationsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get leave allocation by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leaveAllocationsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create a new leave allocation' })
  @ApiCreatedResponse({ description: 'Leave allocation created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateLeaveAllocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveAllocationsService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Update leave allocation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveAllocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveAllocationsService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Delete leave allocation (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Leave allocation deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveAllocationsService.delete(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/approve')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Approve a leave allocation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation approved' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveAllocationsService.approve(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/refuse')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Refuse a leave allocation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation refused' })
  refuse(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveAllocationsService.refuse(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
