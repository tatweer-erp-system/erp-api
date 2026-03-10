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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '../../common/guards/super-admin-ip.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get tenants dropdown list' })
  @ApiResponse({ status: 200, description: 'Dropdown list of active tenants' })
  getDropdown(@Query() query: DropdownQueryDto) {
    return this.tenantsService.getDropdown(query);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  findAll(@Query() query: PaginationDto) {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findById(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create and provision a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant provisioned successfully' })
  @ApiResponse({ status: 409, description: 'Tenant slug already exists' })
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.create(dto, { userId: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant details' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Slug conflict' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.update(id, dto, { userId: user.id });
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant suspended' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant already suspended' })
  suspend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.suspend(id, { userId: user.id });
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant activated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant already active' })
  activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.activate(id, { userId: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 204, description: 'Tenant deleted' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.remove(id, { userId: user.id });
  }
}
