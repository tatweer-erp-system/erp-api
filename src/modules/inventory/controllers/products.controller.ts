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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from '../services/products.service';
import { StockMovementsService } from '../services/stock-movements.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { BulkCreateProductsDto } from '../dto/bulk-create-products.dto';
import { BulkUpdateProductsDto } from '../dto/bulk-update-products.dto';
import { BulkDeleteProductsDto } from '../dto/bulk-delete-products.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Inventory - Products')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get products dropdown list' })
  @Permissions('inventory:read')
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.productsService.getDropdown(tenantId, query);
  }

  @Post('bulk-create')
  @ApiOperation({ summary: 'Bulk create products (max 100)' })
  @Permissions('inventory:create')
  bulkCreate(
    @TenantId() tenantId: string,
    @Body() dto: BulkCreateProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.bulkCreate(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch('bulk-update')
  @ApiOperation({ summary: 'Bulk update products (max 100)' })
  @Permissions('inventory:update')
  bulkUpdate(
    @TenantId() tenantId: string,
    @Body() dto: BulkUpdateProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.bulkUpdate(tenantId, dto, { userId: user.id, tenantId });
  }

  @Delete('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete products (max 100)' })
  @Permissions('inventory:delete')
  bulkDelete(
    @TenantId() tenantId: string,
    @Body() dto: BulkDeleteProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.bulkDelete(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List all products' })
  @Permissions('inventory:read')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.productsService.findAll(tenantId, pagination);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Check product stock availability' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'quantity', required: false, type: Number })
  @Permissions('inventory:read')
  async getAvailability(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('quantity') quantity?: string,
  ) {
    const requestedQty = quantity ? parseFloat(quantity) : undefined;
    return this.stockMovementsService.getProductAvailability(
      tenantId,
      id,
      warehouseId,
      requestedQty,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @Permissions('inventory:read')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @Permissions('inventory:create')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @Permissions('inventory:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.remove(tenantId, id, { userId: user.id, tenantId });
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted product' })
  @Permissions('inventory:update')
  restore(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.restore(tenantId, id, { userId: user.id, tenantId });
  }
}
