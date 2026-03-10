import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
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

  @Get()
  @Permissions('inventory:list')
  findAll(@TenantSlug() slug: string, @Query() p: PaginationDto) {
    return this.productsService.findAll(slug, p);
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.productsService.findOne(slug, id);
  }

  @Post()
  @Permissions('inventory:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.productsService.create(slug, dto, u.id);
  }

  @Patch(':id')
  @Permissions('inventory:update')
  update(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.productsService.update(slug, id, dto, u.id);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.productsService.remove(slug, id);
  }
}
