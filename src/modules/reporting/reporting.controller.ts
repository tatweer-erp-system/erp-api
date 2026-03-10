import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleFeature } from '../../common/decorators/module-feature.decorator';

class ExportReportDto {
  @ApiProperty() @IsString() reportType!: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['pdf', 'csv']) format?: 'pdf' | 'csv';
}

@ApiTags('Reporting')
@ApiBearerAuth()
@ModuleFeature('reporting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboard(@TenantSlug() tenantSlug: string) {
    return this.reportingService.getDashboardStats(tenantSlug);
  }

  @Get('hr')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get HR report' })
  getHrReport(@TenantSlug() tenantSlug: string) {
    return this.reportingService.getHrReport(tenantSlug);
  }

  @Get('inventory')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get inventory report' })
  getInventoryReport(@TenantSlug() tenantSlug: string) {
    return this.reportingService.getInventoryReport(tenantSlug);
  }

  @Post('export')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Export a report (queued)' })
  exportReport(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportReportDto,
  ) {
    return this.reportingService.exportReport(
      tenantSlug,
      dto.reportType,
      {},
      user.id,
      dto.format ?? 'pdf',
    );
  }
}
