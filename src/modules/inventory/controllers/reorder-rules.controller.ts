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

class CreateReorderRuleDto {
  branchId: string;
  productId: string;
  locationId: string;
  minQty?: number;
  maxQty?: number;
  preferredVendorId?: string;
  leadTimeDays?: number;
  isActive?: boolean;
}

class UpdateReorderRuleDto extends CreateReorderRuleDto {
  version: number;
}

@ApiTags('Inventory - Reorder Rules')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/reorder-rules')
export class ReorderRulesController {
  constructor(private readonly inventoryOpsService: InventoryOpsService) {}

  @Get()
  @ApiOperation({ summary: 'List reorder rules' })
  @Permissions('inventory:view')
  findAll(
    @Query('branchId') branchId: string,
    @Query('productId') productId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const isActiveParsed = isActive !== undefined ? isActive === 'true' : undefined;
    return this.inventoryOpsService.findAllReorderRules(
      branchId,
      { productId, isActive: isActiveParsed },
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reorder rule by ID' })
  @Permissions('inventory:view')
  findById(@Param('id') id: string) {
    return this.inventoryOpsService.findReorderRuleById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a reorder rule' })
  @Permissions('inventory:manage')
  create(@Body() dto: CreateReorderRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryOpsService.createReorderRule({
      ...dto,
      createdBy: user.id,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a reorder rule' })
  @Permissions('inventory:manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReorderRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = dto;
    return this.inventoryOpsService.updateReorderRule(id, version, {
      ...data,
      updatedBy: user.id,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reorder rule' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventoryOpsService.removeReorderRule(id);
  }
}
