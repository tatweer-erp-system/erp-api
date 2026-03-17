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
import { ProductVariantsService } from '../services/product-variants.service';
import { AddTemplateAttributeDto } from '../dto/add-template-attribute.dto';
import { UpdateProductVariantDto } from '../dto/update-product-variant.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
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
@Controller('products')
export class ProductVariantsController {
  constructor(private readonly productVariantsService: ProductVariantsService) {}

  // ── Template Attributes ───────────────────────────────────────────────────

  @Get(':id/template-attributes')
  @ApiOperation({ summary: 'Get template attributes for a product' })
  @Permissions('products:view')
  getTemplateAttributes(@TenantId() tenantId: string, @Param('id') productId: string) {
    return this.productVariantsService.getTemplateAttributes(tenantId, productId);
  }

  @Post(':id/template-attributes')
  @ApiOperation({ summary: 'Add an attribute to a product template' })
  @Permissions('products:manage')
  addTemplateAttribute(
    @TenantId() tenantId: string,
    @Param('id') productId: string,
    @Body() dto: AddTemplateAttributeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productVariantsService.addTemplateAttribute(tenantId, productId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('template-attributes/:id')
  @ApiOperation({ summary: 'Remove a template attribute from a product' })
  @Permissions('products:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTemplateAttribute(
    @TenantId() tenantId: string,
    @Param('id') templateAttributeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productVariantsService.removeTemplateAttribute(tenantId, templateAttributeId, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  @Get(':id/variants')
  @ApiOperation({ summary: 'List variants for a product' })
  @Permissions('products:view')
  findVariants(
    @TenantId() tenantId: string,
    @Param('id') productId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.productVariantsService.findVariantsByProduct(tenantId, productId, pagination);
  }

  @Post(':id/generate-variants')
  @ApiOperation({ summary: 'Generate all variant combinations for a product' })
  @Permissions('products:manage')
  generateVariants(
    @TenantId() tenantId: string,
    @Param('id') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productVariantsService.generateVariants(tenantId, productId, {
      userId: user.id,
      tenantId,
    });
  }
}
