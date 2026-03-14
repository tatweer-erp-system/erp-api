import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TablesService } from '../services/tables.service';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TransferTableDto } from '../dto/transfer-table.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Restaurant - Tables')
@Controller('restaurant/tables')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Create a restaurant table' })
  @ApiCreatedResponse({ description: 'Table created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @Permissions('restaurant:view')
  @ApiOperation({ summary: 'List restaurant tables' })
  @ApiOkResponse({ description: 'Paginated list of tables' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.tablesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('restaurant:view')
  @ApiOperation({ summary: 'Get a restaurant table by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Table details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tablesService.findById(tenantId, id);
  }

  @Patch(':id')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Update a restaurant table' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Table updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Soft delete a restaurant table' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Table deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.remove(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/transfer')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Transfer table session to another table' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Table session transferred' })
  transfer(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: TransferTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.transfer(tenantId, id, dto, { userId: user.id, tenantId });
  }
}
