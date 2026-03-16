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
import { InventoryOpsService } from '../services/inventory-ops.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { LocationType } from '@/common/enums/inventory.enums';

class CreateStockLocationDto {
  nameEn: string;
  nameAr: string;
  parentId?: string;
  warehouseId?: string;
  locationType?: LocationType;
  isScrap?: boolean;
  isReturn?: boolean;
  isActive?: boolean;
}

class UpdateStockLocationDto extends CreateStockLocationDto {
  version: number;
}

@ApiTags('Inventory - Stock Locations')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/stock-locations')
export class StockLocationsController {
  constructor(private readonly inventoryOpsService: InventoryOpsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get stock locations dropdown list' })
  @Permissions('inventory:view')
  getDropdown(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryOpsService.stockLocationsDropdown(warehouseId);
  }

  @Get()
  @ApiOperation({ summary: 'List stock locations' })
  @Permissions('inventory:view')
  findAll(
    @Query('warehouseId') warehouseId?: string,
    @Query('locationType') locationType?: LocationType,
    @Query('isActive') isActive?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const isActiveParsed = isActive !== undefined ? isActive === 'true' : undefined;
    return this.inventoryOpsService.findAllStockLocations(
      { warehouseId, locationType, isActive: isActiveParsed },
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock location by ID' })
  @Permissions('inventory:view')
  findById(@Param('id') id: string) {
    return this.inventoryOpsService.findStockLocationById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a stock location' })
  @Permissions('inventory:create')
  create(@Body() dto: CreateStockLocationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryOpsService.createStockLocation({
      ...dto,
      createdBy: user.id,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a stock location' })
  @Permissions('inventory:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStockLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = dto;
    return this.inventoryOpsService.updateStockLocation(id, version, {
      ...data,
      updatedBy: user.id,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stock location' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventoryOpsService.removeStockLocation(id);
  }
}
