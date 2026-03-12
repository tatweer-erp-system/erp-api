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
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get projects dropdown list' })
  @ApiOkResponse({ description: 'Projects dropdown list' })
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.projectsService.getDropdown(tenantId, query);
  }

  @Get()
  @Permissions('projects:read')
  @ApiOperation({ summary: 'List all projects' })
  @ApiOkResponse({ description: 'Paginated list of projects' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.projectsService.findAll(tenantId, query);
  }

  @Get(':id/members')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get project members' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'List of project members' })
  getMembers(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.getMembers(id, tenantId);
  }

  @Get(':id/assignable-users')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get assignable users (employees with active status)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'List of assignable users' })
  getAssignableUsers(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.getAssignableUsers(id, tenantId);
  }

  @Get(':id')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.findById(tenantId, id);
  }

  @Get(':id/progress')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get project progress (task completion %)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project progress data' })
  getProgress(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.getProgress(tenantId, id);
  }

  @Post()
  @Permissions('projects:create')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiCreatedResponse({ description: 'Project created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/activate')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Activate project (planning -> active)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project activated' })
  activate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.activate(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/hold')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Put project on hold (active -> on_hold)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project put on hold' })
  hold(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.hold(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/resume')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Resume project (on_hold -> active)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project resumed' })
  resume(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.resume(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/complete')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Complete project (active -> completed)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project completed' })
  complete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.complete(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/cancel')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Cancel project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project cancelled' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.cancel(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('projects:delete')
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.remove(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Project Members ──────────────────────────────────────────────────────

  @Post(':id/members')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Add a member to a project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Member added to project' })
  addMember(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { userId: string; role: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.addMember(id, tenantId, body.userId, body.role, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id/members/:userId')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Update project member role' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Member role updated' })
  updateMemberRole(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateMemberRole(id, userId, body.role, tenantId, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id/members/:userId')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Remove a member from a project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Member removed from project' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.removeMember(id, userId, tenantId, {
      userId: user.id,
      tenantId,
    });
  }
}
