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
import { JournalsService } from '../services/journals.service';
import { CreateJournalDto } from '../dto/create-journal.dto';
import { UpdateJournalDto } from '../dto/update-journal.dto';
import { FilterJournalDto } from '../dto/filter-journal.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting Setup - Journals')
@Controller('journals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all journals' })
  @ApiOkResponse({ description: 'Paginated list of journals' })
  findAll(@TenantId() tenantId: string, @Query() query: FilterJournalDto) {
    return this.journalsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get journal by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.journalsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new journal' })
  @ApiCreatedResponse({ description: 'Journal created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateJournalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update journal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Journal updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJournalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Soft delete journal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Journal deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
