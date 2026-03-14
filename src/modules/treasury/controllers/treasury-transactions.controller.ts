import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { TreasuryTransactionsService } from '../services/treasury-transactions.service';
import { CreateTreasuryTransactionDto } from '../dto/create-treasury-transaction.dto';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Treasury - Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treasury')
export class TreasuryTransactionsController {
  constructor(private readonly service: TreasuryTransactionsService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Create a receipt, payment, or opening balance transaction' })
  @Permissions('treasury:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTreasuryTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Post('transfers')
  @ApiOperation({ summary: 'Create a transfer between two treasury accounts' })
  @Permissions('treasury:manage')
  transfer(
    @TenantId() tenantId: string,
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.transfer(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get('accounts/:id/transactions')
  @ApiOperation({ summary: 'List transactions for a specific treasury account' })
  @Permissions('treasury:view')
  findByAccount(
    @TenantId() tenantId: string,
    @Param('id') accountId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.findByAccount(tenantId, accountId, pagination);
  }

  @Get('accounts/:id/statement')
  @ApiOperation({ summary: 'Get account statement with running balance' })
  @Permissions('treasury:view')
  getStatement(
    @TenantId() tenantId: string,
    @Param('id') accountId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.getStatement(tenantId, accountId, pagination);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get a single transaction by ID' })
  @Permissions('treasury:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }
}
