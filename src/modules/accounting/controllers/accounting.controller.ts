import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AccountingService } from '../services/accounting.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AccountType, JournalType } from '@/common/enums/accounting.enums';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ── Chart of Accounts ─────────────────────────────────────────────────────

  @Get('chart-of-accounts')
  @ApiOperation({ summary: 'List chart of accounts' })
  @ApiOkResponse({ description: 'Paginated list of accounts' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'accountType', required: false, enum: AccountType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllAccounts(
    @Query('search') search?: string,
    @Query('accountType') accountType?: AccountType,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountingService.findAllAccounts(
      {
        search,
        accountType,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('chart-of-accounts/dropdown')
  @ApiOperation({ summary: 'Chart of accounts dropdown' })
  @ApiQuery({ name: 'accountType', required: false, enum: AccountType })
  accountDropdown(@Query('accountType') accountType?: AccountType) {
    return this.accountingService.accountDropdown(accountType);
  }

  @Get('chart-of-accounts/:id')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Account details' })
  findAccountById(@Param('id') id: string) {
    return this.accountingService.findAccountById(id);
  }

  @Post('chart-of-accounts')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiCreatedResponse({ description: 'Account created' })
  createAccount(@Body() body: Record<string, any>) {
    return this.accountingService.createAccount(body);
  }

  @Put('chart-of-accounts/:id')
  @ApiOperation({ summary: 'Update account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Account updated' })
  updateAccount(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.accountingService.updateAccount(id, version, data);
  }

  @Delete('chart-of-accounts/:id')
  @ApiOperation({ summary: 'Delete account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Account deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAccount(@Param('id') id: string) {
    return this.accountingService.removeAccount(id);
  }

  // ── Journals ──────────────────────────────────────────────────────────────

  @Get('journals')
  @ApiOperation({ summary: 'List accounting journals' })
  @ApiOkResponse({ description: 'List of journals' })
  @ApiQuery({ name: 'journalType', required: false, enum: JournalType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAllJournals(
    @Query('journalType') journalType?: JournalType,
    @Query('isActive') isActive?: string,
  ) {
    return this.accountingService.findAllJournals(
      journalType,
      isActive !== undefined ? isActive === 'true' : undefined,
    );
  }

  @Get('journals/dropdown')
  @ApiOperation({ summary: 'Journals dropdown' })
  @ApiQuery({ name: 'journalType', required: false, enum: JournalType })
  journalDropdown(@Query('journalType') journalType?: JournalType) {
    return this.accountingService.journalDropdown(journalType);
  }

  @Get('journals/:id')
  @ApiOperation({ summary: 'Get journal by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findJournalById(@Param('id') id: string) {
    return this.accountingService.findJournalById(id);
  }

  @Post('journals')
  @ApiOperation({ summary: 'Create a journal' })
  @ApiCreatedResponse({ description: 'Journal created' })
  createJournal(@Body() body: Record<string, any>) {
    return this.accountingService.createJournal(body);
  }

  @Put('journals/:id')
  @ApiOperation({ summary: 'Update journal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateJournal(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.accountingService.updateJournal(id, version, data);
  }

  @Delete('journals/:id')
  @ApiOperation({ summary: 'Delete journal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Journal deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeJournal(@Param('id') id: string) {
    return this.accountingService.removeJournal(id);
  }

  // ── Fiscal Periods ────────────────────────────────────────────────────────

  @Get('fiscal-periods')
  @ApiOperation({ summary: 'List fiscal periods' })
  findAllFiscalPeriods() {
    return this.accountingService.findAllFiscalPeriods();
  }

  @Get('fiscal-periods/current')
  @ApiOperation({ summary: 'Get current open fiscal period' })
  findCurrentFiscalPeriod() {
    return this.accountingService.findCurrentFiscalPeriod();
  }

  @Get('fiscal-periods/:id')
  @ApiOperation({ summary: 'Get fiscal period by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findFiscalPeriodById(@Param('id') id: string) {
    return this.accountingService.findFiscalPeriodById(id);
  }

  @Post('fiscal-periods')
  @ApiOperation({ summary: 'Create a fiscal period' })
  @ApiCreatedResponse({ description: 'Fiscal period created' })
  createFiscalPeriod(@Body() body: Record<string, any>) {
    return this.accountingService.createFiscalPeriod(body);
  }

  @Put('fiscal-periods/:id')
  @ApiOperation({ summary: 'Update fiscal period' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateFiscalPeriod(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.accountingService.updateFiscalPeriod(id, version, data);
  }

  @Delete('fiscal-periods/:id')
  @ApiOperation({ summary: 'Delete fiscal period' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Fiscal period deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFiscalPeriod(@Param('id') id: string) {
    return this.accountingService.removeFiscalPeriod(id);
  }
}
