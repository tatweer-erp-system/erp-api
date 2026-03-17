import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductVariantsService } from '../services/product-variants.service';
import { UpdateProductVariantDto } from '../dto/update-product-variant.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Product Variants')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('product-variants')
export class ProductVariantsDetailController {
  constructor(private readonly productVariantsService: ProductVariantsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single variant by ID' })
  @Permissions('products:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productVariantsService.findVariantById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product variant' })
  @Permissions('products:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productVariantsService.updateVariant(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }
}
