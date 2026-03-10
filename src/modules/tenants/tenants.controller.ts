import { Controller, Get, Post, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { TenantProvisionerService } from './tenant-provisioner.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '../../common/guards/super-admin-ip.guard';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantProvisionerService: TenantProvisionerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Provision a new tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantProvisionerService.provision(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant by slug' })
  findOne(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a tenant' })
  deactivate(@Param('id') id: string) {
    return this.tenantsService.deactivate(id);
  }
}
