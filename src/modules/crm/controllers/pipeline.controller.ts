import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeadsService } from '../services/leads.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('CRM - Pipeline & Reports')
@ApiBearerAuth()
@ModuleFeature('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm')
export class PipelineController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('pipeline')
  @ApiOperation({ summary: 'Get leads pipeline grouped by status' })
  @Permissions('crm:view')
  getPipeline(@TenantId() tenantId: string) {
    return this.leadsService.getPipeline(tenantId);
  }

  @Get('reports/conversion')
  @ApiOperation({ summary: 'Get lead conversion report' })
  @Permissions('crm:view')
  getConversionReport(@TenantId() tenantId: string) {
    return this.leadsService.getConversionReport(tenantId);
  }
}
