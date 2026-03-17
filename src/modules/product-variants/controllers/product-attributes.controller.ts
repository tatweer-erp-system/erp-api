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
import { ProductAttributesService } from '../services/product-attributes.service';
import { CreateProductAttributeDto } from '../dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from '../dto/update-product-attribute.dto';
import { CreateAttributeValueDto } from '../dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from '../dto/update-attribute-value.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Product Attributes')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('product-attributes')
export class ProductAttributesController {
  constructor(private readonly productAttributesService: ProductAttributesService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get product attributes dropdown list' })
  @Permissions('products:view')
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.productAttributesService.getAttributeDropdown(tenantId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all product attributes' })
  @Permissions('products:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.productAttributesService.findAllAttributes(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product attribute by ID with its values' })
  @Permissions('products:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productAttributesService.findAttributeById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product attribute' })
  @Permissions('products:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProductAttributeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productAttributesService.createAttribute(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product attribute' })
  @Permissions('products:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductAttributeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productAttributesService.updateAttribute(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product attribute' })
  @Permissions('products:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productAttributesService.removeAttribute(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Attribute Values ──────────────────────────────────────────────────────

  @Get(':id/values')
  @ApiOperation({ summary: 'List values for a product attribute' })
  @Permissions('products:view')
  findValues(
    @TenantId() tenantId: string,
    @Param('id') attributeId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.productAttributesService.findAttributeValues(tenantId, attributeId, pagination);
  }

  @Post(':id/values')
  @ApiOperation({ summary: 'Create a value for a product attribute' })
  @Permissions('products:manage')
  createValue(
    @TenantId() tenantId: string,
    @Param('id') attributeId: string,
    @Body() dto: CreateAttributeValueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productAttributesService.createAttributeValue(tenantId, attributeId, dto, {
      userId: user.id,
      tenantId,
    });
  }
}
