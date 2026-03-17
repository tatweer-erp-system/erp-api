import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { SalesOrdersService } from '../services/sales-orders.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { CreateSalesOrderLineDto } from '../dto/create-sales-order-line.dto';
import { UpdateSalesOrderLineDto } from '../dto/update-sales-order-line.dto';
import { CreateInvoiceFromSODto } from '../dto/create-invoice-from-so.dto';
import { SalesReportQueryDto } from '../dto/sales-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { PdfGeneratorService } from '@/common/services/pdf-generator.service';
import { ExcelGeneratorService } from '@/common/services/excel-generator.service';
import { ExportFormat } from '@/common/enums/reporting.enums';

@ApiTags('Sales - Orders')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/orders')
export class SalesOrdersController {
  constructor(
    private readonly salesOrdersService: SalesOrdersService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a draft sales order' })
  @Permissions('sales:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List sales orders with pagination and filters' })
  @Permissions('sales:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.salesOrdersService.findAll(tenantId, pagination);
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Sales summary report — totals, breakdowns by status' })
  @ApiQuery({ name: 'format', required: false, enum: ExportFormat })
  @Permissions('sales:view')
  async getSalesSummary(
    @TenantId() tenantId: string,
    @Query() query: SalesReportQueryDto,
    @Query('format') format?: ExportFormat,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.salesOrdersService.getSalesSummary(tenantId, query);

    if (format === ExportFormat.PDF && res) {
      const d = data as any;
      const rows: Record<string, unknown>[] = [
        { metric: 'Total Orders', value: d.totalOrders ?? 0 },
        { metric: 'Total Amount', value: d.totalAmount ?? 0 },
        { metric: 'Average Order Value', value: d.avgOrderValue ?? 0 },
      ];
      if (d.byStatus && Array.isArray(d.byStatus)) {
        for (const s of d.byStatus) {
          rows.push({ metric: `Status: ${s.status}`, value: s.count ?? s.total ?? 0 });
        }
      }
      const period =
        query.dateFrom && query.dateTo ? { from: query.dateFrom, to: query.dateTo } : undefined;
      const pdf = this.pdfGenerator.generateTable({
        title: 'Sales Summary Report',
        tenantName: 'Tatweer ERP',
        period,
        columns: [
          { key: 'metric', label: 'Metric', align: 'left', format: 'text' },
          { key: 'value', label: 'Value', align: 'right', format: 'number' },
        ],
        rows,
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sales-summary-${dateStr}.pdf"`,
      });
      res.send(pdf);
      return;
    }

    if (format === ExportFormat.XLSX && res) {
      const d = data as any;
      const rows: Record<string, unknown>[] = [
        { metric: 'Total Orders', value: d.totalOrders ?? 0 },
        { metric: 'Total Amount', value: d.totalAmount ?? 0 },
        { metric: 'Average Order Value', value: d.avgOrderValue ?? 0 },
      ];
      if (d.byStatus && Array.isArray(d.byStatus)) {
        for (const s of d.byStatus) {
          rows.push({ metric: `Status: ${s.status}`, value: s.count ?? s.total ?? 0 });
        }
      }
      const xlsx = await this.excelGenerator.generateWorkbook({
        title: 'Sales Summary Report',
        sheets: [
          {
            name: 'Sales Summary',
            columns: [
              { key: 'metric', header: 'Metric', width: 30 },
              { key: 'value', header: 'Value', width: 20 },
            ],
            rows,
          },
        ],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sales-summary-${dateStr}.xlsx"`,
      });
      res.send(xlsx);
      return;
    }

    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sales order by ID with lines' })
  @Permissions('sales:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft sales order' })
  @Permissions('sales:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  // ── Status transitions ──────────────────────────────────────────────────────

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a draft sales order — locks exchange rate, reserves stock' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.confirm(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/create-invoice')
  @ApiOperation({ summary: 'Create an invoice from this sales order' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.CREATED)
  createInvoice(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateInvoiceFromSODto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.createInvoice(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/create-delivery')
  @ApiOperation({ summary: 'Create a delivery from this sales order' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.CREATED)
  createDelivery(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.createDelivery(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a sales order (draft or confirmed only, no linked invoices/deliveries)',
  })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.cancel(tenantId, id, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a draft sales order' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.remove(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Line management ─────────────────────────────────────────────────────────

  @Post(':id/lines')
  @ApiOperation({ summary: 'Add a line to a draft sales order' })
  @Permissions('sales:manage')
  addLine(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: CreateSalesOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.addLine(tenantId, orderId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id/lines/:lineId')
  @ApiOperation({ summary: 'Update a line on a draft sales order' })
  @Permissions('sales:manage')
  updateLine(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateSalesOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.updateLine(tenantId, orderId, lineId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id/lines/:lineId')
  @ApiOperation({ summary: 'Remove a line from a draft sales order' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  removeLine(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.removeLine(tenantId, orderId, lineId, {
      userId: user.id,
      tenantId,
    });
  }
}
