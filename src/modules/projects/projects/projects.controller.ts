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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

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
  getDropdown(@TenantSlug() tenantSlug: string, @Query() query: DropdownQueryDto) {
    return this.projectsService.getDropdown(tenantSlug, query);
  }

  @Get()
  @Permissions('projects:read')
  @ApiOperation({ summary: 'List all projects' })
  @ApiOkResponse({ description: 'Paginated list of projects' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.projectsService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project details' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.projectsService.findById(tenantSlug, id);
  }

  @Get(':id/progress')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'Get project progress (task completion %)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project progress data' })
  getProgress(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.projectsService.getProgress(tenantSlug, id);
  }

  @Post()
  @Permissions('projects:create')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiCreatedResponse({ description: 'Project created' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.create(tenantSlug, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Put(':id')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project updated' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.update(tenantSlug, id, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/activate')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Activate project (planning -> active)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project activated' })
  activate(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.activate(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/hold')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Put project on hold (active -> on_hold)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project put on hold' })
  hold(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.hold(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/resume')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Resume project (on_hold -> active)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project resumed' })
  resume(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.resume(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/complete')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Complete project (active -> completed)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project completed' })
  complete(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.complete(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/cancel')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Cancel project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Project cancelled' })
  cancel(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.cancel(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Delete(':id')
  @Permissions('projects:delete')
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.remove(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }
}
