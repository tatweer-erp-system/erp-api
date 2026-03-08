import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@ModuleFeature('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}
  @Get() @Permissions('projects:list') findAll(@TenantSlug() s: string, @Query() p: PaginationDto) { return this.projectsService.findAll(s, p); }
  @Get(':id') @Permissions('projects:read') findOne(@TenantSlug() s: string, @Param('id') id: string) { return this.projectsService.findOne(s, id); }
  @Post() @Permissions('projects:create') create(@TenantSlug() s: string, @Body() dto: CreateProjectDto, @CurrentUser() u: AuthenticatedUser) { return this.projectsService.create(s, dto, u.id); }
  @Delete(':id') @Permissions('projects:delete') @HttpCode(HttpStatus.NO_CONTENT) remove(@TenantSlug() s: string, @Param('id') id: string) { return this.projectsService.remove(s, id); }
}
