import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('Inventory - Stock')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/stock')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get('levels')
  @ApiOperation({ summary: 'Get paginated stock levels' })
  @Permissions('inventory:read')
  getStockLevels(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.stockMovementsService.getStockLevels(slug, pagination);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @Permissions('inventory:read')
  getLowStockAlerts(@TenantSlug() slug: string) {
    return this.stockMovementsService.getLowStockAlerts(slug);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List all stock movements' })
  @Permissions('inventory:read')
  findAll(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.stockMovementsService.findAll(slug, pagination);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get stock movement by ID' })
  @Permissions('inventory:read')
  findById(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.stockMovementsService.findById(slug, id);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create a stock movement' })
  @Permissions('inventory:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockMovementsService.create(slug, dto, { userId: user.id, tenantSlug: slug });
  }
}
