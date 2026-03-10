import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
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
import { EmployeesService } from '../services/employees.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantSlug } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Employees')
@Controller('hr/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get employees dropdown list' })
  @ApiOkResponse({ description: 'Employees dropdown list' })
  getDropdown(@TenantSlug() tenantSlug: string, @Query() query: DropdownQueryDto) {
    return this.employeesService.getDropdown(tenantSlug, query);
  }

  @Get()
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List all employees' })
  @ApiOkResponse({ description: 'Paginated list of employees' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.employeesService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee details with decrypted sensitive fields' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.employeesService.findById(tenantSlug, id);
  }

  @Post()
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiCreatedResponse({ description: 'Employee created' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.create(tenantSlug, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Put(':id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update employee' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee updated' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.update(tenantSlug, id, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Delete(':id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete employee (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Employee deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.remove(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Patch(':id/restore')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Restore soft-deleted employee' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee restored' })
  restore(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.restore(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }
}
