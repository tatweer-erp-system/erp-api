import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ReportingService } from '../services/reporting.service';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ExportReportDto } from '../dto/export-report.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('Reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  @ApiOkResponse({ description: 'Dashboard KPI data' })
  getDashboard(@TenantSlug() tenantSlug: string) {
    return this.reportingService.getDashboard(tenantSlug);
  }

  @Get('sales')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiOkResponse({ description: 'Sales report data' })
  getSalesReport(@TenantSlug() tenantSlug: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getSalesReport(tenantSlug, query);
  }

  @Get('inventory')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get inventory report' })
  @ApiOkResponse({ description: 'Inventory report data' })
  getInventoryReport(@TenantSlug() tenantSlug: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getInventoryReport(tenantSlug, query);
  }

  @Get('hr')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get HR report' })
  @ApiOkResponse({ description: 'HR report data' })
  getHrReport(@TenantSlug() tenantSlug: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getHrReport(tenantSlug, query);
  }

  @Get('financial')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get financial report' })
  @ApiOkResponse({ description: 'Financial report data' })
  getFinancialReport(@TenantSlug() tenantSlug: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getFinancialReport(tenantSlug, query);
  }

  @Get('crm')
  @Permissions('reporting:read')
  @ApiOperation({ summary: 'Get CRM report' })
  @ApiOkResponse({ description: 'CRM pipeline report data' })
  getCrmReport(@TenantSlug() tenantSlug: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getCrmReport(tenantSlug, query);
  }

  @Post('export')
  @Permissions('reporting:export')
  @ApiOperation({ summary: 'Export report (async, queued)' })
  @ApiCreatedResponse({ description: 'Export job queued' })
  exportReport(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportReportDto,
  ) {
    return this.reportingService.exportReport(tenantSlug, dto, user.id);
  }
}
