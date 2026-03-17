import { Controller, Get, Query, UseGuards, BadRequestException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from '../services/reports.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { PdfGeneratorService } from '@/common/services/pdf-generator.service';
import { ExcelGeneratorService } from '@/common/services/excel-generator.service';
import { ExportFormat } from '@/common/enums/reporting.enums';

@ApiTags('Accounting - Reports')
@Controller('accounting/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  @Get('trial-balance')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Trial balance report' })
  @ApiQuery({ name: 'from', type: 'string', example: '2026-01-01' })
  @ApiQuery({ name: 'to', type: 'string', example: '2026-12-31' })
  @ApiQuery({ name: 'journalId', type: 'string', required: false })
  @ApiQuery({ name: 'groupByAccountGroup', type: 'boolean', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ExportFormat })
  @ApiOkResponse({ description: 'Trial balance data' })
  async trialBalance(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('journalId') journalId?: string,
    @Query('groupByAccountGroup') groupByAccountGroup?: string,
    @Query('format') format?: ExportFormat,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (!from || !to) throw new BadRequestException('"from" and "to" query params are required');
    const data = await this.reportsService.trialBalance(tenantId, from, to, {
      journalId,
      groupByAccountGroup: groupByAccountGroup === 'true',
    });

    if (format === ExportFormat.PDF && res) {
      const pdf = this.pdfGenerator.generateTable({
        title: 'Trial Balance',
        tenantName: 'Tatweer ERP',
        period: { from, to },
        columns: [
          { key: 'code', label: 'Code', align: 'left', format: 'text' },
          { key: 'nameEn', label: 'Account', align: 'left', format: 'text' },
          { key: 'totalDebit', label: 'Debit', align: 'right', format: 'currency' },
          { key: 'totalCredit', label: 'Credit', align: 'right', format: 'currency' },
          { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
        ],
        rows: (data.data ?? []) as Record<string, unknown>[],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="trial-balance-${dateStr}.pdf"`,
      });
      res.send(pdf);
      return;
    }

    if (format === ExportFormat.XLSX && res) {
      const xlsx = await this.excelGenerator.generateWorkbook({
        title: 'Trial Balance',
        sheets: [
          {
            name: 'Trial Balance',
            columns: [
              { key: 'code', header: 'Code', width: 12 },
              { key: 'nameEn', header: 'Account', width: 30 },
              { key: 'nameAr', header: 'Account (AR)', width: 30 },
              { key: 'accountType', header: 'Type', width: 14 },
              { key: 'totalDebit', header: 'Debit', width: 18 },
              { key: 'totalCredit', header: 'Credit', width: 18 },
              { key: 'balance', header: 'Balance', width: 18 },
            ],
            rows: (data.data ?? []) as Record<string, unknown>[],
          },
        ],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="trial-balance-${dateStr}.xlsx"`,
      });
      res.send(xlsx);
      return;
    }

    return data;
  }

  @Get('general-ledger')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'General ledger for an account' })
  @ApiQuery({ name: 'accountId', type: 'string', example: 'uuid' })
  @ApiQuery({ name: 'from', type: 'string', example: '2026-01-01' })
  @ApiQuery({ name: 'to', type: 'string', example: '2026-12-31' })
  @ApiOkResponse({ description: 'General ledger entries' })
  generalLedger(
    @TenantId() tenantId: string,
    @Query('accountId') accountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!accountId || !from || !to)
      throw new BadRequestException('"accountId", "from", and "to" query params are required');
    return this.reportsService.generalLedger(tenantId, accountId, from, to);
  }

  @Get('income-statement')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Income statement (P&L)' })
  @ApiQuery({ name: 'from', type: 'string', example: '2026-01-01' })
  @ApiQuery({ name: 'to', type: 'string', example: '2026-12-31' })
  @ApiQuery({ name: 'costCenterId', type: 'string', required: false })
  @ApiQuery({ name: 'journalId', type: 'string', required: false })
  @ApiQuery({ name: 'costCenterBreakdown', type: 'boolean', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ExportFormat })
  @ApiOkResponse({ description: 'Income statement data' })
  async incomeStatement(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('costCenterId') costCenterId?: string,
    @Query('journalId') journalId?: string,
    @Query('costCenterBreakdown') costCenterBreakdown?: string,
    @Query('format') format?: ExportFormat,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (!from || !to) throw new BadRequestException('"from" and "to" query params are required');
    const data = await this.reportsService.incomeStatement(tenantId, from, to, costCenterId, {
      journalId,
      costCenterBreakdown: costCenterBreakdown === 'true',
    });

    // Cost center breakdown returns a different shape — return as-is
    if ('costCenters' in data) {
      return data;
    }

    if (format === ExportFormat.PDF && res) {
      const rows: Record<string, unknown>[] = [
        { item: 'Revenue', amount: data.revenue },
        { item: 'Cost of Goods Sold', amount: data.cogs },
        { item: 'Gross Profit', amount: data.grossProfit },
        { item: 'Operating Expenses', amount: data.expenses },
        { item: 'Net Income', amount: data.netIncome },
      ];
      const pdf = this.pdfGenerator.generateTable({
        title: 'Income Statement',
        tenantName: 'Tatweer ERP',
        period: { from, to },
        columns: [
          { key: 'item', label: 'Item', align: 'left', format: 'text' },
          { key: 'amount', label: 'Amount (SAR)', align: 'right', format: 'currency' },
        ],
        rows,
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="income-statement-${dateStr}.pdf"`,
      });
      res.send(pdf);
      return;
    }

    if (format === ExportFormat.XLSX && res) {
      const rows: Record<string, unknown>[] = [
        { item: 'Revenue', amount: data.revenue },
        { item: 'Cost of Goods Sold', amount: data.cogs },
        { item: 'Gross Profit', amount: data.grossProfit },
        { item: 'Operating Expenses', amount: data.expenses },
        { item: 'Net Income', amount: data.netIncome },
      ];
      const xlsx = await this.excelGenerator.generateWorkbook({
        title: 'Income Statement',
        sheets: [
          {
            name: 'Income Statement',
            columns: [
              { key: 'item', header: 'Item', width: 30 },
              { key: 'amount', header: 'Amount (SAR)', width: 20 },
            ],
            rows,
          },
        ],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="income-statement-${dateStr}.xlsx"`,
      });
      res.send(xlsx);
      return;
    }

    return data;
  }

  @Get('balance-sheet')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Balance sheet' })
  @ApiQuery({ name: 'asOfDate', type: 'string', example: '2026-12-31' })
  @ApiQuery({ name: 'format', required: false, enum: ExportFormat })
  @ApiOkResponse({ description: 'Balance sheet data' })
  async balanceSheet(
    @TenantId() tenantId: string,
    @Query('asOfDate') asOfDate: string,
    @Query('format') format?: ExportFormat,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (!asOfDate) throw new BadRequestException('"asOfDate" query param is required');
    const data = await this.reportsService.balanceSheet(tenantId, asOfDate);

    if (format === ExportFormat.PDF && res) {
      const rows: Record<string, unknown>[] = [
        ...((data.assets ?? []) as Record<string, unknown>[]).map((a: any) => ({
          code: a.code,
          nameEn: a.nameEn,
          type: 'Asset',
          balance: a.balance,
        })),
        ...((data.liabilities ?? []) as Record<string, unknown>[]).map((a: any) => ({
          code: a.code,
          nameEn: a.nameEn,
          type: 'Liability',
          balance: a.balance,
        })),
        ...((data.equity ?? []) as Record<string, unknown>[]).map((a: any) => ({
          code: a.code,
          nameEn: a.nameEn,
          type: 'Equity',
          balance: a.balance,
        })),
      ];
      const pdf = this.pdfGenerator.generateTable({
        title: 'Balance Sheet',
        tenantName: 'Tatweer ERP',
        columns: [
          { key: 'code', label: 'Code', align: 'left', format: 'text' },
          { key: 'nameEn', label: 'Account', align: 'left', format: 'text' },
          { key: 'type', label: 'Type', align: 'left', format: 'text' },
          { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
        ],
        rows,
        totals: {
          code: '',
          nameEn: 'Total',
          type: '',
          balance: data.totalAssets,
        },
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="balance-sheet-${dateStr}.pdf"`,
      });
      res.send(pdf);
      return;
    }

    if (format === ExportFormat.XLSX && res) {
      const assetsRows = ((data.assets ?? []) as Record<string, unknown>[]).map((a: any) => ({
        code: a.code,
        nameEn: a.nameEn,
        balance: parseFloat(String(a.balance ?? 0)),
      }));
      const liabRows = ((data.liabilities ?? []) as Record<string, unknown>[]).map((a: any) => ({
        code: a.code,
        nameEn: a.nameEn,
        balance: parseFloat(String(a.balance ?? 0)),
      }));
      const eqRows = ((data.equity ?? []) as Record<string, unknown>[]).map((a: any) => ({
        code: a.code,
        nameEn: a.nameEn,
        balance: parseFloat(String(a.balance ?? 0)),
      }));
      const cols = [
        { key: 'code', header: 'Code', width: 12 },
        { key: 'nameEn', header: 'Account', width: 30 },
        { key: 'balance', header: 'Balance (SAR)', width: 20 },
      ];
      const xlsx = await this.excelGenerator.generateWorkbook({
        title: 'Balance Sheet',
        sheets: [
          { name: 'Assets', columns: cols, rows: assetsRows },
          { name: 'Liabilities', columns: cols, rows: liabRows },
          { name: 'Equity', columns: cols, rows: eqRows },
        ],
      });
      const dateStr = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="balance-sheet-${dateStr}.xlsx"`,
      });
      res.send(xlsx);
      return;
    }

    return data;
  }

  @Get('account-statement')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Account statement with opening/closing balances' })
  @ApiQuery({ name: 'accountId', type: 'string', example: 'uuid' })
  @ApiQuery({ name: 'from', type: 'string', example: '2026-01-01' })
  @ApiQuery({ name: 'to', type: 'string', example: '2026-12-31' })
  @ApiOkResponse({ description: 'Account statement data' })
  accountStatement(
    @TenantId() tenantId: string,
    @Query('accountId') accountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!accountId || !from || !to)
      throw new BadRequestException('"accountId", "from", and "to" query params are required');
    return this.reportsService.accountStatement(tenantId, accountId, from, to);
  }
}
