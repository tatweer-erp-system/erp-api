import {
  Controller,
  Get,
  Post,
  Patch,
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
} from '@nestjs/swagger';
import { JournalEntriesService } from '../services/journal-entries.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from '../dto/update-journal-entry.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting - Journal Entries')
@Controller('accounting/journal-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all journal entries' })
  @ApiOkResponse({ description: 'Paginated list of journal entries' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.journalEntriesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get journal entry with lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal entry with lines' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.journalEntriesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new draft journal entry' })
  @ApiCreatedResponse({ description: 'Journal entry created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalEntriesService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update draft journal entry' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal entry updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJournalEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalEntriesService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Post(':id/post')
  @Permissions('accounting:post')
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal entry posted' })
  post(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalEntriesService.post(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/reverse')
  @Permissions('accounting:post')
  @ApiOperation({ summary: 'Reverse a posted journal entry' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Reversal entry created and posted' })
  reverse(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalEntriesService.reverse(tenantId, id, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Delete a draft journal entry' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Journal entry deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalEntriesService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
