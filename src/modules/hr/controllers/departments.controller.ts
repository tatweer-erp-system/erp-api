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
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantSlug } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Departments')
@Controller('hr/departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get departments dropdown list' })
  @ApiOkResponse({ description: 'Departments dropdown list' })
  getDropdown(@TenantSlug() tenantSlug: string, @Query() query: DropdownQueryDto) {
    return this.departmentsService.getDropdown(tenantSlug, query);
  }

  @Get()
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List all departments' })
  @ApiOkResponse({ description: 'Paginated list of departments' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.departmentsService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Department details' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.departmentsService.findById(tenantSlug, id);
  }

  @Post()
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new department' })
  @ApiCreatedResponse({ description: 'Department created' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentsService.create(tenantSlug, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Put(':id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Department updated' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentsService.update(tenantSlug, id, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Delete(':id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete department (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Department deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentsService.remove(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }
}
