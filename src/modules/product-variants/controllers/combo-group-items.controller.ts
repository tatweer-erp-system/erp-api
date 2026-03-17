import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ComboProductsService } from '../services/combo-products.service';
import { CreateComboGroupItemDto } from '../dto/create-combo-group-item.dto';
import { UpdateComboGroupItemDto } from '../dto/update-combo-group-item.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Combo Group Items')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('combo-group-items')
export class ComboGroupItemsController {
  constructor(private readonly comboProductsService: ComboProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Add an item to a combo group' })
  @Permissions('products:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateComboGroupItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.createItem(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a combo group item' })
  @Permissions('products:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateComboGroupItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.updateItem(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a combo group item' })
  @Permissions('products:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.removeItem(tenantId, id, { userId: user.id, tenantId });
  }
}
