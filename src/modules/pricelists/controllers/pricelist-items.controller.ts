import {
  Controller,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PricelistsService } from '../services/pricelists.service';
import { UpdatePricelistItemDto } from '../dto/update-pricelist-item.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Sales - Pricelist Items')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pricelist-items')
export class PricelistItemsController {
  constructor(private readonly pricelistsService: PricelistsService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Update a pricelist item' })
  @Permissions('sales:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePricelistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.updateItem(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pricelist item' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricelistsService.removeItem(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
