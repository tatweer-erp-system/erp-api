import {
  Body,
  Controller,
  Delete,
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
import { BankStatementsService } from '../services/bank-statements.service';
import { CreateBankStatementDto } from '../dto/create-bank-statement.dto';
import { UpdateBankStatementDto } from '../dto/update-bank-statement.dto';
import { FilterBankStatementDto } from '../dto/filter-bank-statement.dto';
import { CreateBankStatementLineDto } from '../dto/create-bank-statement-line.dto';
import { MatchLineDto } from '../dto/match-line.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Bank Statements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bank-statements')
export class BankStatementsController {
  constructor(private readonly service: BankStatementsService) {}

  // ── Statement endpoints ───────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List bank statements' })
  @Permissions('accounting:view')
  findAll(@TenantId() tenantId: string, @Query() filter: FilterBankStatementDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Post()
  @ApiOperation({ summary: 'Create a bank statement' })
  @Permissions('accounting:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateBankStatementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bank statement with lines' })
  @Permissions('accounting:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post(':id/import')
  @ApiOperation({ summary: 'Import lines from CSV file' })
  @ApiConsumes('multipart/form-data')
  @Permissions('accounting:manage')
  @UseInterceptors(FileInterceptor('file'))
  async importLines(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const content = file.buffer.toString('utf-8');
    return this.service.importLines(tenantId, id, content, { userId: user.id, tenantId });
  }

  @Post(':id/auto-match')
  @ApiOperation({ summary: 'Auto-match statement lines to payments/entries' })
  @Permissions('accounting:manage')
  autoMatch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.autoMatch(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate and post the bank statement' })
  @Permissions('accounting:manage')
  validate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.validate(tenantId, id, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an open bank statement' })
  @Permissions('accounting:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Line endpoints ────────────────────────────────────────────────────────

  @Get(':id/lines')
  @ApiOperation({ summary: 'List paginated lines for a statement' })
  @Permissions('accounting:view')
  findLines(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.findLines(tenantId, id, pagination);
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Add a line to a bank statement' })
  @Permissions('accounting:manage')
  addLine(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateBankStatementLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addLine(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete('lines/:lineId')
  @ApiOperation({ summary: 'Delete an unreconciled line' })
  @Permissions('accounting:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLine(
    @TenantId() tenantId: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeLine(tenantId, lineId, { userId: user.id, tenantId });
  }

  @Post('lines/:lineId/match')
  @ApiOperation({ summary: 'Manually match a line to a payment or journal entry' })
  @Permissions('accounting:manage')
  matchLine(
    @TenantId() tenantId: string,
    @Param('lineId') lineId: string,
    @Body() dto: MatchLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.matchLine(tenantId, lineId, dto, { userId: user.id, tenantId });
  }

  @Post('lines/:lineId/unmatch')
  @ApiOperation({ summary: 'Remove match from a reconciled line' })
  @Permissions('accounting:manage')
  unmatchLine(
    @TenantId() tenantId: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.unmatchLine(tenantId, lineId, { userId: user.id, tenantId });
  }
}
