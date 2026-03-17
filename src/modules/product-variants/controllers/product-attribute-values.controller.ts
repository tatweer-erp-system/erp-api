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
import { ProductAttributesService } from '../services/product-attributes.service';
import { UpdateAttributeValueDto } from '../dto/update-attribute-value.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Product Attribute Values')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('product-attribute-values')
export class ProductAttributeValuesController {
  constructor(private readonly productAttributesService: ProductAttributesService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Update an attribute value' })
  @Permissions('products:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAttributeValueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productAttributesService.updateAttributeValue(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attribute value' })
  @Permissions('products:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productAttributesService.removeAttributeValue(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
