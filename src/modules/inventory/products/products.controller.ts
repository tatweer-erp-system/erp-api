import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkCreateProductsDto } from './dto/bulk-create-products.dto';
import { BulkUpdateProductsDto } from './dto/bulk-update-products.dto';
import { BulkDeleteProductsDto } from './dto/bulk-delete-products.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('Inventory - Products')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get products dropdown list' })
  @Permissions('inventory:read')
  getDropdown(@TenantSlug() slug: string, @Query() query: DropdownQueryDto) {
    return this.productsService.getDropdown(slug, query);
  }

  @Post('bulk-create')
  @ApiOperation({ summary: 'Bulk create products (max 100)' })
  @Permissions('inventory:create')
  bulkCreate(
    @TenantSlug() slug: string,
    @Body() dto: BulkCreateProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.bulkCreate(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Patch('bulk-update')
  @ApiOperation({ summary: 'Bulk update products (max 100)' })
  @Permissions('inventory:update')
  bulkUpdate(
    @TenantSlug() slug: string,
    @Body() dto: BulkUpdateProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.bulkUpdate(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Delete('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete products (max 100)' })
  @Permissions('inventory:delete')
  bulkDelete(
    @TenantSlug() slug: string,
    @Body() dto: BulkDeleteProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.bulkDelete(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Get()
  @ApiOperation({ summary: 'List all products' })
  @Permissions('inventory:read')
  findAll(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.productsService.findAll(slug, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @Permissions('inventory:read')
  findById(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.productsService.findById(slug, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @Permissions('inventory:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.create(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @Permissions('inventory:update')
  update(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(slug, id, dto, { userId: user.id, tenantSlug: slug });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.remove(slug, id, { userId: user.id, tenantSlug: slug });
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted product' })
  @Permissions('inventory:update')
  restore(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.restore(slug, id, { userId: user.id, tenantSlug: slug });
  }
}
