import { Controller, Get, Post, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { AccountingService } from '../services/accounting.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { JournalEntryStatus } from '@/common/enums/accounting.enums';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting/journal-entries')
export class JournalEntriesController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get()
  @ApiOperation({ summary: 'List journal entries for a branch' })
  @ApiOkResponse({ description: 'Paginated list of journal entries' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiQuery({ name: 'status', required: false, enum: JournalEntryStatus })
  @ApiQuery({ name: 'journalId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('status') status?: JournalEntryStatus,
    @Query('journalId') journalId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountingService.findAllJournalEntries(
      branchId,
      { status, journalId },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal entry details' })
  findById(@Param('id') id: string) {
    return this.accountingService.findJournalEntryById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get journal entry with lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal entry with line items' })
  findWithLines(@Param('id') id: string) {
    return this.accountingService.findJournalEntryWithLines(id);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal entry posted' })
  post(@Param('id') id: string, @Body() body: { sequence: string }) {
    return this.accountingService.postJournalEntry(id, body.sequence);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a journal entry' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal entry cancelled' })
  cancel(@Param('id') id: string) {
    return this.accountingService.cancelJournalEntry(id);
  }
}
