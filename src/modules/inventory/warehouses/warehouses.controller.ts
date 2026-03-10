import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('Inventory - Warehouses')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @Permissions('inventory:list')
  findAll(@TenantSlug() slug: string) {
    return this.warehousesService.findAll(slug);
  }

  @Get(':id')
  @Permissions('inventory:read')
  findOne(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.warehousesService.findOne(slug, id);
  }

  @Post()
  @Permissions('inventory:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.warehousesService.create(slug, dto, u.id);
  }
}
