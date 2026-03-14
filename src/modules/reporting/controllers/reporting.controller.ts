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
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @Permissions('reporting:view')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  @ApiOkResponse({ description: 'Dashboard KPI data' })
  getDashboard(@TenantId() tenantId: string) {
    return this.reportingService.getDashboard(tenantId);
  }

  @Get('sales')
  @Permissions('reporting:view')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiOkResponse({ description: 'Sales report data' })
  getSalesReport(@TenantId() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getSalesReport(tenantId, query);
  }

  @Get('inventory')
  @Permissions('reporting:view')
  @ApiOperation({ summary: 'Get inventory report' })
  @ApiOkResponse({ description: 'Inventory report data' })
  getInventoryReport(@TenantId() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getInventoryReport(tenantId, query);
  }

  @Get('hr')
  @Permissions('reporting:view')
  @ApiOperation({ summary: 'Get HR report' })
  @ApiOkResponse({ description: 'HR report data' })
  getHrReport(@TenantId() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getHrReport(tenantId, query);
  }

  @Get('financial')
  @Permissions('reporting:view')
  @ApiOperation({ summary: 'Get financial report' })
  @ApiOkResponse({ description: 'Financial report data' })
  getFinancialReport(@TenantId() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getFinancialReport(tenantId, query);
  }

  @Get('crm')
  @Permissions('reporting:view')
  @ApiOperation({ summary: 'Get CRM report' })
  @ApiOkResponse({ description: 'CRM pipeline report data' })
  getCrmReport(@TenantId() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportingService.getCrmReport(tenantId, query);
  }

  @Post('export')
  @Permissions('reporting:export')
  @ApiOperation({ summary: 'Export report (async, queued)' })
  @ApiCreatedResponse({ description: 'Export job queued' })
  exportReport(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportReportDto,
  ) {
    return this.reportingService.exportReport(tenantId, dto, user.id);
  }
}
