import { Controller, Get, Post, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { StockMovementsService } from '../services/stock-movements.service';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
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

@ApiTags('Inventory - Stock')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class StockMovementsController {
  constructor(
    private readonly stockMovementsService: StockMovementsService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  @Get('stock-levels')
  @ApiOperation({ summary: 'List all stock levels' })
  @Permissions('inventory:view')
  getStockLevels(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.stockMovementsService.getStockLevels(tenantId, pagination);
  }

  @Get('stock-levels/:productId')
  @ApiOperation({ summary: 'Get stock levels by product' })
  @Permissions('inventory:view')
  getStockLevelsByProduct(
    @TenantId() tenantId: string,
    @Param('productId') productId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.stockMovementsService.getByProduct(tenantId, productId, pagination);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @Permissions('inventory:view')
  getLowStockAlerts(@TenantId() tenantId: string) {
    return this.stockMovementsService.getLowStockAlerts(tenantId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List all stock movements' })
  @Permissions('inventory:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.stockMovementsService.findAll(tenantId, pagination);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get stock movement by ID' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.stockMovementsService.findById(tenantId, id);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @ApiQuery({ name: 'format', required: false, enum: ExportFormat })
  @Permissions('inventory:view')
  async getValuation(
    @TenantId() tenantId: string,
    @Query('format') format?: ExportFormat,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.stockMovementsService.getValuationReport(tenantId);

    const rows = Array.isArray(data)
      ? data
      : ((data as any)?.data ?? (data as any)?.rows ?? [data]);

    if (format === ExportFormat.PDF && res) {
      const pdf = this.pdfGenerator.generateTable({
        title: 'Inventory Valuation',
        tenantName: 'Tatweer ERP',
        columns: [
          { key: 'productName', label: 'Product', align: 'left', format: 'text' },
          { key: 'sku', label: 'SKU', align: 'left', format: 'text' },
          { key: 'quantity', label: 'Quantity', align: 'right', format: 'number' },
          { key: 'cost', label: 'Unit Cost', align: 'right', format: 'currency' },
          { key: 'totalValue', label: 'Total Value', align: 'right', format: 'currency' },
        ],
        rows: rows as Record<string, unknown>[],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inventory-valuation-${dateStr}.pdf"`,
      });
      res.send(pdf);
      return;
    }

    if (format === ExportFormat.XLSX && res) {
      const xlsx = await this.excelGenerator.generateWorkbook({
        title: 'Inventory Valuation',
        sheets: [
          {
            name: 'Valuation',
            columns: [
              { key: 'productName', header: 'Product', width: 30 },
              { key: 'sku', header: 'SKU', width: 18 },
              { key: 'quantity', header: 'Quantity', width: 12 },
              { key: 'cost', header: 'Unit Cost', width: 15 },
              { key: 'totalValue', header: 'Total Value', width: 18 },
            ],
            rows: rows as Record<string, unknown>[],
          },
        ],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="inventory-valuation-${dateStr}.xlsx"`,
      });
      res.send(xlsx);
      return;
    }

    return data;
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create a stock movement' })
  @Permissions('inventory:create')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockMovementsService.create(tenantId, dto, { userId: user.id, tenantId });
  }
}
