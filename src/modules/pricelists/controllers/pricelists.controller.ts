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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PricelistsService } from '../services/pricelists.service';
import { CreatePricelistDto } from '../dto/create-pricelist.dto';
import { UpdatePricelistDto } from '../dto/update-pricelist.dto';
import { CreatePricelistItemDto } from '../dto/create-pricelist-item.dto';
import { ComputePriceQueryDto } from '../dto/compute-price-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Sales - Pricelists')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pricelists')
export class PricelistsController {
  constructor(private readonly pricelistsService: PricelistsService) {}

  // ── Pricelists CRUD ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all pricelists' })
  @Permissions('sales:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.pricelistsService.findAll(tenantId, pagination);
  }

  @Get('compute-price')
  @ApiOperation({ summary: 'Compute price for a product using a pricelist' })
  @Permissions('sales:view')
  computePrice(@TenantId() tenantId: string, @Query() query: ComputePriceQueryDto) {
    return this.pricelistsService.computePrice(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pricelist by ID' })
  @Permissions('sales:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pricelistsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a pricelist' })
  @Permissions('sales:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePricelistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a pricelist' })
  @Permissions('sales:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePricelistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pricelist' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.remove(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Pricelist Items ─────────────────────────────────────────────────────────

  @Get(':id/items')
  @ApiOperation({ summary: 'Get items of a pricelist' })
  @Permissions('sales:view')
  getItems(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pricelistsService.getItems(tenantId, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a pricelist' })
  @Permissions('sales:manage')
  createItem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreatePricelistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.createItem(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }
}
