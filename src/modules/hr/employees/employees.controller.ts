import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('HR - Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Permissions('hr:list')
  findAll(@TenantSlug() tenantSlug: string, @Query() pagination: PaginationDto) {
    return this.employeesService.findAll(tenantSlug, pagination);
  }

  @Get(':id')
  @Permissions('hr:read')
  findOne(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.employeesService.findOne(tenantSlug, id);
  }

  @Post()
  @Permissions('hr:create')
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.create(tenantSlug, dto, user.id);
  }

  @Patch(':id')
  @Permissions('hr:update')
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.update(tenantSlug, id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.employeesService.remove(tenantSlug, id);
  }
}
