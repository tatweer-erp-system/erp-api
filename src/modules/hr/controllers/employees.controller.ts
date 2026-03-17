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
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get employees dropdown list' })
  @ApiOkResponse({ description: 'Employees dropdown list' })
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.employeesService.getDropdown(tenantId, query);
  }

  @Get()
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all employees' })
  @ApiOkResponse({ description: 'Paginated list of employees' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.employeesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get employee by ID (includes active contract summary)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee details with active contract summary' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new employee (employeeNumber is auto-generated)' })
  @ApiCreatedResponse({ description: 'Employee created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Strip any employeeNumber/employeeId from body — it is auto-generated
    const safeDto = { ...dto };
    delete (safeDto as any).employeeNumber;
    delete (safeDto as any).employeeId;

    return this.employeesService.create(tenantId, safeDto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update employee' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete employee (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Employee deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.remove(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/restore')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Restore soft-deleted employee' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee restored' })
  restore(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.restore(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
