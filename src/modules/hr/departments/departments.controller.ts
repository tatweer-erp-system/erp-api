import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('HR - Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Permissions('hr:list')
  findAll(@TenantSlug() tenantSlug: string) {
    return this.departmentsService.findAll(tenantSlug);
  }

  @Get(':id')
  @Permissions('hr:read')
  findOne(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.departmentsService.findOne(tenantSlug, id);
  }

  @Post()
  @Permissions('hr:create')
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentsService.create(tenantSlug, dto, user.id);
  }

  @Delete(':id')
  @Permissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.departmentsService.remove(tenantSlug, id);
  }
}
