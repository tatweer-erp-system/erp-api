import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ReconciliationService } from '../services/reconciliation.service';
import { CreateReconciliationDto } from '../dto/create-reconciliation.dto';
import { MatchTransactionsDto } from '../dto/match-transactions.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Treasury - Reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treasury/reconciliations')
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a bank reconciliation session' })
  @Permissions('treasury:reconcile')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateReconciliationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List reconciliation sessions' })
  @Permissions('treasury:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.service.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reconciliation session by ID' })
  @Permissions('treasury:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Get(':id/unmatched')
  @ApiOperation({ summary: 'List unmatched transactions for a reconciliation' })
  @Permissions('treasury:reconcile')
  getUnmatched(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getUnmatched(tenantId, id);
  }

  @Post(':id/match')
  @ApiOperation({ summary: 'Mark transactions as reconciled' })
  @Permissions('treasury:reconcile')
  @HttpCode(HttpStatus.OK)
  match(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: MatchTransactionsDto) {
    return this.service.matchTransactions(tenantId, id, dto);
  }

  @Post(':id/unmatch')
  @ApiOperation({ summary: 'Unmark transactions as reconciled' })
  @Permissions('treasury:reconcile')
  @HttpCode(HttpStatus.OK)
  unmatch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MatchTransactionsDto,
  ) {
    return this.service.unmatchTransactions(tenantId, id, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a reconciliation session (difference must be zero)' })
  @Permissions('treasury:reconcile')
  @HttpCode(HttpStatus.OK)
  complete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.complete(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/import')
  @ApiOperation({ summary: 'Import bank statement file (CSV) for matching' })
  @ApiConsumes('multipart/form-data')
  @Permissions('treasury:reconcile')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  importStatement(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    return this.service.importStatement(tenantId, id, file.buffer, file.mimetype);
  }
}
