import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryOpsService } from '../services/inventory-ops.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Inventory - Stock Quants')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/stock-quants')
export class StockQuantsController {
  constructor(private readonly inventoryOpsService: InventoryOpsService) {}

  @Get()
  @ApiOperation({ summary: 'Get stock quants (on-hand quantities) by branch' })
  @Permissions('inventory:view')
  findByBranch(
    @Query('branchId') branchId: string,
    @Query('productId') productId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.inventoryOpsService.getStockByBranch(branchId, productId, locationId);
  }

  @Get('on-hand')
  @ApiOperation({ summary: 'Get total on-hand quantity for a product in a branch' })
  @Permissions('inventory:view')
  getOnHand(@Query('branchId') branchId: string, @Query('productId') productId: string) {
    return this.inventoryOpsService.getOnHand(branchId, productId);
  }
}
