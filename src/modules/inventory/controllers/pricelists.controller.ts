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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PricelistsService } from '../services/pricelists.service';
import { CreatePricelistDto } from '../dto/create-pricelist.dto';
import { UpdatePricelistDto } from '../dto/update-pricelist.dto';
import { CreatePricelistItemDto } from '../dto/create-pricelist-item.dto';
import { UpdatePricelistItemDto } from '../dto/update-pricelist-item.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Inventory - Pricelists')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pricelists')
export class PricelistsController {
  constructor(private readonly pricelistsService: PricelistsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get pricelists dropdown list' })
  @Permissions('inventory:view')
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.pricelistsService.getDropdown(tenantId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all pricelists' })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @Permissions('inventory:view')
  findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationDto,
    @Query('isActive') isActive?: string,
  ) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.pricelistsService.findAll(tenantId, { ...pagination, isActive: active } as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pricelist by ID (includes items)' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pricelistsService.findByIdWithItems(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a pricelist' })
  @Permissions('inventory:create')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePricelistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a pricelist' })
  @Permissions('inventory:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePricelistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pricelist (also deletes all its items)' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.remove(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Pricelist Items ─────────────────────────────────────────────────────────

  @Post(':id/items')
  @ApiOperation({ summary: 'Add a rule (item) to a pricelist' })
  @Permissions('inventory:create')
  addItem(
    @TenantId() tenantId: string,
    @Param('id') pricelistId: string,
    @Body() dto: CreatePricelistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.addItem(tenantId, pricelistId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a pricelist item' })
  @Permissions('inventory:update')
  updateItem(
    @TenantId() tenantId: string,
    @Param('id') pricelistId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePricelistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.updateItem(tenantId, pricelistId, itemId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Delete a pricelist item' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @TenantId() tenantId: string,
    @Param('id') pricelistId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.removeItem(tenantId, pricelistId, itemId, {
      userId: user.id,
      tenantId,
    });
  }
}
