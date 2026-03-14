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
import { LogTimeDto } from '../dto/log-time.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Projects - Tasks')
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('projects')
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('overdue')
  @Permissions('projects:view')
  @ApiOperation({ summary: 'Get overdue tasks for a project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'List of overdue tasks' })
  getOverdueTasks(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.getOverdueTasks(tenantId, projectId);
  }

  @Post(':id/log')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Log time on a task' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Time logged' })
  logTime(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: LogTimeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.logTime(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }
}

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('projects')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Permissions('projects:view')
  @ApiOperation({ summary: 'List all tasks' })
  @ApiOkResponse({ description: 'Paginated list of tasks' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.tasksService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('projects:view')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Task details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tasksService.findById(tenantId, id);
  }

  @Post()
  @Permissions('projects:create')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({ description: 'Task created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Task updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/transition')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Transition task status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Task status transitioned' })
  transition(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.transition(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('projects:delete')
  @ApiOperation({ summary: 'Delete task (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Task deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.remove(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Get('by-project/:projectId')
  @Permissions('projects:view')
  @ApiOperation({ summary: 'Get tasks by project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Paginated list of tasks for a project' })
  getByProject(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query() query: PaginationDto,
  ) {
    return this.tasksService.getByProject(tenantId, projectId, query);
  }
}
