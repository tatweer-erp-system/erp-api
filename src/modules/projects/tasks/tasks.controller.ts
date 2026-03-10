import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@ModuleFeature('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}
  @Get() @Permissions('projects:list') findAll(
    @TenantSlug() s: string,
    @Param('projectId') pId: string,
    @Query() p: PaginationDto,
  ) {
    return this.tasksService.findAll(s, pId, p);
  }
  @Get(':id') @Permissions('projects:read') findOne(
    @TenantSlug() s: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.findOne(s, id);
  }
  @Post() @Permissions('projects:create') create(
    @TenantSlug() s: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.tasksService.create(s, dto, u.id);
  }
}
