import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StockMovementsService } from '../services/stock-movements.service';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Inventory - Stock')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get('stock-levels')
  @ApiOperation({ summary: 'List all stock levels' })
  @Permissions('inventory:view')
  getStockLevels(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.stockMovementsService.getStockLevels(tenantId, pagination);
  }

  @Get('stock-levels/:productId')
  @ApiOperation({ summary: 'Get stock levels by product' })
  @Permissions('inventory:view')
  getStockLevelsByProduct(
    @TenantId() tenantId: string,
    @Param('productId') productId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.stockMovementsService.getByProduct(tenantId, productId, pagination);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @Permissions('inventory:view')
  getLowStockAlerts(@TenantId() tenantId: string) {
    return this.stockMovementsService.getLowStockAlerts(tenantId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List all stock movements' })
  @Permissions('inventory:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.stockMovementsService.findAll(tenantId, pagination);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get stock movement by ID' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.stockMovementsService.findById(tenantId, id);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @Permissions('inventory:view')
  getValuation(@TenantId() tenantId: string) {
    return this.stockMovementsService.getValuationReport(tenantId);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create a stock movement' })
  @Permissions('inventory:create')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockMovementsService.create(tenantId, dto, { userId: user.id, tenantId });
  }
}
