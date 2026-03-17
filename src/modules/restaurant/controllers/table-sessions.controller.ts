import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TableSessionsService } from '../services/table-sessions.service';
import { CreateTableSessionDto } from '../dto/create-table-session.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Restaurant - Table Sessions')
@Controller('restaurant/table-sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TableSessionsController {
  constructor(private readonly tableSessionsService: TableSessionsService) {}

  @Post()
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Seat guests — create a table session' })
  @ApiCreatedResponse({ description: 'Table session created' })
  seat(
    @TenantId() tenantId: string,
    @Body() dto: CreateTableSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tableSessionsService.seat(tenantId, dto, { userId: user.id, tenantId });
  }

  @Post(':id/release')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Release a table session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Table session released' })
  @HttpCode(HttpStatus.OK)
  release(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tableSessionsService.release(tenantId, id, { userId: user.id, tenantId });
  }

  @Get()
  @Permissions('restaurant:view')
  @ApiOperation({ summary: 'List table sessions' })
  @ApiOkResponse({ description: 'Paginated list of table sessions' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.tableSessionsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('restaurant:view')
  @ApiOperation({ summary: 'Get a table session by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Table session details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tableSessionsService.findById(tenantId, id);
  }
}
