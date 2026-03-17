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
import { ActivitiesService } from '../services/activities.service';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { UpdateActivityDto } from '../dto/update-activity.dto';
import { MarkDoneActivityDto } from '../dto/mark-done-activity.dto';
import { FilterActivityDto } from '../dto/filter-activity.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('my')
  @Permissions('activities:view')
  @ApiOperation({ summary: 'Get current user activities' })
  @ApiOkResponse({ description: 'Paginated list of current user activities' })
  findMyActivities(
    @TenantId() tenantId: string,
    @Query() query: FilterActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.findMyActivities(tenantId, user.id, query);
  }

  @Get('overdue')
  @Permissions('activities:view')
  @ApiOperation({ summary: 'Get overdue activities' })
  @ApiOkResponse({ description: 'Paginated list of overdue activities' })
  findOverdue(@TenantId() tenantId: string, @Query() query: FilterActivityDto) {
    return this.activitiesService.findOverdue(tenantId, query);
  }

  @Get()
  @Permissions('activities:view')
  @ApiOperation({ summary: 'List all activities with filters' })
  @ApiOkResponse({ description: 'Paginated list of activities' })
  findAll(@TenantId() tenantId: string, @Query() query: FilterActivityDto) {
    return this.activitiesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('activities:view')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Activity details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.activitiesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('activities:manage')
  @ApiOperation({ summary: 'Create a new activity' })
  @ApiCreatedResponse({ description: 'Activity created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('activities:manage')
  @ApiOperation({ summary: 'Update an activity (only if not done)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Activity updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/mark-done')
  @Permissions('activities:manage')
  @ApiOperation({ summary: 'Mark activity as done with optional feedback' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Activity marked as done' })
  markDone(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MarkDoneActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.markDone(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('activities:manage')
  @ApiOperation({ summary: 'Soft delete an activity' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Activity deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.remove(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
