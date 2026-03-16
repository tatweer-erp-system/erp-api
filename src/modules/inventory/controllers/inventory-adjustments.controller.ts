import {
  Controller,
  Get,
  Post,
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
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { AdjustmentStatus } from '@/common/enums/inventory.enums';

class CreateAdjustmentDto {
  branchId: string;
  locationId: string;
  date: Date;
  reference?: string;
  responsibleId?: string;
}

class AdjustmentLineDto {
  productId: string;
  locationId?: string;
  onHandQty?: number;
  countedQty: number;
  differenceQty?: number;
  cost?: number;
}

@ApiTags('Inventory - Adjustments')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/adjustments')
export class InventoryAdjustmentsController {
  constructor(private readonly inventoryOpsService: InventoryOpsService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory adjustments' })
  @Permissions('inventory:view')
  findAll(
    @TenantId() _tenantId: string,
    @Query('branchId') branchId: string,
    @Query('status') status?: AdjustmentStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.inventoryOpsService.findAllAdjustments(
      branchId,
      status,
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory adjustment by ID' })
  @Permissions('inventory:view')
  findById(@Param('id') id: string) {
    return this.inventoryOpsService.findAdjustmentById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get inventory adjustment with lines' })
  @Permissions('inventory:view')
  findWithLines(@Param('id') id: string) {
    return this.inventoryOpsService.findAdjustmentWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an inventory adjustment' })
  @Permissions('inventory:manage')
  create(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryOpsService.createAdjustment({
      ...dto,
      createdBy: user.id,
    });
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert lines on an inventory adjustment' })
  @Permissions('inventory:manage')
  upsertLines(@Param('id') id: string, @Body() lines: AdjustmentLineDto[]) {
    return this.inventoryOpsService.upsertAdjustmentLines(id, lines);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate an inventory adjustment' })
  @Permissions('inventory:manage')
  @HttpCode(HttpStatus.OK)
  validate(@Param('id') id: string) {
    return this.inventoryOpsService.validateAdjustment(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an inventory adjustment' })
  @Permissions('inventory:manage')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.inventoryOpsService.cancelAdjustment(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inventory adjustment' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventoryOpsService.removeAdjustment(id);
  }
}
