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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TasksService } from '../services/tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TransitionTaskDto } from '../dto/transition-task.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('Projects - Tasks')
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('projects')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('tasks')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'List all tasks' })
  @ApiOkResponse({ description: 'Paginated list of tasks' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.tasksService.findAll(tenantSlug, query);
  }

  @Get('tasks/:id')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Task details' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.tasksService.findById(tenantSlug, id);
  }

  @Post('tasks')
  @Permissions('projects:create')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({ description: 'Task created' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.create(tenantSlug, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Put('tasks/:id')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Task updated' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.update(tenantSlug, id, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch('tasks/:id/transition')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Transition task status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Task status transitioned' })
  transition(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.transition(tenantSlug, id, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Delete('tasks/:id')
  @Permissions('projects:delete')
  @ApiOperation({ summary: 'Delete task (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Task deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.remove(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Get(':projectId/tasks')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get tasks by project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Paginated list of tasks for a project' })
  getByProject(
    @TenantSlug() tenantSlug: string,
    @Param('projectId') projectId: string,
    @Query() query: PaginationDto,
  ) {
    return this.tasksService.getByProject(tenantSlug, projectId, query);
  }
}
