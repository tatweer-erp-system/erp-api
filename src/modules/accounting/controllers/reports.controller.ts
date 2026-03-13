import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from '../services/reports.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';

@ApiTags('Accounting - Reports')
@Controller('accounting/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @Permissions('accounting:read')
  @ApiOperation({ summary: 'Trial balance report' })
  @ApiQuery({ name: 'from', type: 'string', example: '2026-01-01' })
  @ApiQuery({ name: 'to', type: 'string', example: '2026-12-31' })
  @ApiOkResponse({ description: 'Trial balance data' })
  trialBalance(@TenantId() tenantId: string, @Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) throw new BadRequestException('"from" and "to" query params are required');
    return this.reportsService.trialBalance(tenantId, from, to);
  }

  @Get('general-ledger')
  @Permissions('accounting:read')
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
  @Permissions('accounting:read')
  @ApiOperation({ summary: 'Income statement (P&L)' })
  @ApiQuery({ name: 'from', type: 'string', example: '2026-01-01' })
  @ApiQuery({ name: 'to', type: 'string', example: '2026-12-31' })
  @ApiQuery({ name: 'costCenterId', type: 'string', required: false })
  @ApiOkResponse({ description: 'Income statement data' })
  incomeStatement(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('costCenterId') costCenterId?: string,
  ) {
    if (!from || !to) throw new BadRequestException('"from" and "to" query params are required');
    return this.reportsService.incomeStatement(tenantId, from, to, costCenterId);
  }

  @Get('balance-sheet')
  @Permissions('accounting:read')
  @ApiOperation({ summary: 'Balance sheet' })
  @ApiQuery({ name: 'asOfDate', type: 'string', example: '2026-12-31' })
  @ApiOkResponse({ description: 'Balance sheet data' })
  balanceSheet(@TenantId() tenantId: string, @Query('asOfDate') asOfDate: string) {
    if (!asOfDate) throw new BadRequestException('"asOfDate" query param is required');
    return this.reportsService.balanceSheet(tenantId, asOfDate);
  }

  @Get('account-statement')
  @Permissions('accounting:read')
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
