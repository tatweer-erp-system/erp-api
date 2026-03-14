import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportingService } from '../services/reporting.service';
import { DashboardService } from '../services/dashboard.service';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ExportReportDto } from '../dto/export-report.dto';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { PdfGeneratorService } from '@/common/services/pdf-generator.service';
import { ExcelGeneratorService } from '@/common/services/excel-generator.service';
import { ExportFormat } from '@/common/enums/reporting.enums';
import { DashboardResult } from '../services/dashboard.service';

@ApiTags('Reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly dashboardService: DashboardService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  @Get('dashboard')
  @Permissions('reporting:view')
  @ApiOperation({ summary: 'Get dashboard KPIs with optional PDF/XLSX export' })
  @ApiOkResponse({ description: 'Dashboard KPI data' })
  async getDashboard(
    @TenantId() tenantId: string,
    @Query() query: DashboardQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.dashboardService.getDashboard(tenantId, query.from, query.to);

    if (query.format === ExportFormat.PDF) {
      const rows = this.flattenDashboardToRows(data);
      const pdf = this.pdfGenerator.generateTable({
        title: 'Dashboard Report',
        tenantName: 'Tatweer ERP',
        period: data.period,
        columns: [
          { key: 'metric', label: 'Metric', align: 'left', format: 'text' },
          { key: 'value', label: 'Value', align: 'right', format: 'number' },
        ],
        rows,
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dashboard-${dateStr}.pdf"`,
      });
      res.send(pdf);
      return;
    }

    if (query.format === ExportFormat.XLSX) {
      const rows = this.flattenDashboardToRows(data);
      const xlsx = await this.excelGenerator.generateWorkbook({
        title: 'Dashboard Report',
        sheets: [
          {
            name: 'Dashboard',
            columns: [
              { key: 'metric', header: 'Metric', width: 35 },
              { key: 'value', header: 'Value', width: 20 },
            ],
            rows,
          },
        ],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="dashboard-${dateStr}.xlsx"`,
      });
      res.send(xlsx);
      return;
    }

    return data;
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

  private flattenDashboardToRows(data: DashboardResult): Record<string, unknown>[] {
    const d = data as any;
    return [
      { metric: 'Revenue — Total', value: d.revenue?.total ?? 0 },
      { metric: 'Revenue — POS', value: d.revenue?.byChannel?.pos ?? 0 },
      { metric: 'Revenue — Sales Orders', value: d.revenue?.byChannel?.salesOrders ?? 0 },
      { metric: 'Revenue — vs Last Period (%)', value: d.revenue?.vsLastPeriod ?? 0 },
      { metric: 'Expenses — Total', value: d.expenses?.total ?? 0 },
      { metric: 'Expenses — COGS', value: d.expenses?.cogs ?? 0 },
      { metric: 'Expenses — Salaries', value: d.expenses?.salaries ?? 0 },
      { metric: 'Expenses — Other', value: d.expenses?.other ?? 0 },
      { metric: 'Net Income', value: d.netIncome ?? 0 },
      { metric: 'Inventory — Total Value', value: d.inventory?.totalValue ?? 0 },
      { metric: 'Inventory — Low Stock Count', value: d.inventory?.lowStockCount ?? 0 },
      { metric: 'Inventory — Pending Receipts', value: d.inventory?.pendingReceiptsCount ?? 0 },
      { metric: 'Sales — Orders Count', value: d.sales?.ordersCount ?? 0 },
      { metric: 'Sales — Avg Order Value', value: d.sales?.avgOrderValue ?? 0 },
      { metric: 'Sales — Pending Invoice Count', value: d.sales?.pendingInvoiceCount ?? 0 },
      { metric: 'POS — Orders Today', value: d.pos?.ordersToday ?? 0 },
      { metric: 'POS — Revenue Today', value: d.pos?.revenueToday ?? 0 },
      { metric: 'POS — Active Sessions', value: d.pos?.activeSessions ?? 0 },
      { metric: 'HR — Headcount', value: d.hr?.headcount ?? 0 },
      { metric: 'HR — Pending Payroll Runs', value: d.hr?.pendingPayrollRuns ?? 0 },
      { metric: 'HR — Expiring Contracts', value: d.hr?.expiringContractsCount ?? 0 },
      { metric: 'Receivables — Total', value: d.receivables?.total ?? 0 },
      { metric: 'Receivables — Overdue Count', value: d.receivables?.overdueCount ?? 0 },
      { metric: 'Payables — Total', value: d.payables?.total ?? 0 },
      { metric: 'Payables — Overdue Count', value: d.payables?.overdueCount ?? 0 },
    ];
  }
}
