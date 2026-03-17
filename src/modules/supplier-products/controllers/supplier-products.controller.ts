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
import { SupplierProductsService } from '../services/supplier-products.service';
import { CreateSupplierProductDto } from '../dto/create-supplier-product.dto';
import { UpdateSupplierProductDto } from '../dto/update-supplier-product.dto';
import { SupplierProductFilterDto } from '../dto/supplier-product-filter.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Purchasing - Supplier Products')
@ApiBearerAuth()
@ModuleFeature('purchasing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('supplier-products')
export class SupplierProductsController {
  constructor(private readonly supplierProductsService: SupplierProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List supplier products' })
  @Permissions('purchasing:view')
  findAll(@TenantId() tenantId: string, @Query() query: SupplierProductFilterDto) {
    return this.supplierProductsService.findAll(tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a supplier product' })
  @Permissions('purchasing:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSupplierProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierProductsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a supplier product' })
  @Permissions('purchasing:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierProductsService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a supplier product' })
  @Permissions('purchasing:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierProductsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
