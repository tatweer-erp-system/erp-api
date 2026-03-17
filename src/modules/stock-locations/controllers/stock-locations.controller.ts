import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StockLocationsService } from '../services/stock-locations.service';
import { CreateStockLocationDto } from '../dto/create-stock-location.dto';
import { UpdateStockLocationDto } from '../dto/update-stock-location.dto';
import { StockLocationQueryDto } from '../dto/stock-location-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Stock Locations')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-locations')
export class StockLocationsController {
  constructor(private readonly stockLocationsService: StockLocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List stock locations' })
  @Permissions('inventory:view')
  findAll(@TenantId() tenantId: string, @Query() query: StockLocationQueryDto) {
    return this.stockLocationsService.findAll(tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a stock location' })
  @Permissions('inventory:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateStockLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockLocationsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock location by ID' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.stockLocationsService.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a stock location' })
  @Permissions('inventory:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStockLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockLocationsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a stock location' })
  @Permissions('inventory:manage')
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockLocationsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
