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
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
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

  @Get('dropdown')
  @ApiOperation({ summary: 'Get warehouses dropdown list' })
  @Permissions('inventory:read')
  getDropdown(@TenantSlug() slug: string, @Query() query: DropdownQueryDto) {
    return this.warehousesService.getDropdown(slug, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  @Permissions('inventory:read')
  findAll(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.warehousesService.findAll(slug, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @Permissions('inventory:read')
  findById(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.warehousesService.findById(slug, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a warehouse' })
  @Permissions('inventory:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.create(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a warehouse' })
  @Permissions('inventory:update')
  update(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.update(slug, id, dto, { userId: user.id, tenantSlug: slug });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a warehouse' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.remove(slug, id, { userId: user.id, tenantSlug: slug });
  }
}
