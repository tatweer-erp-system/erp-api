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
import { ComboProductsService } from '../services/combo-products.service';
import { CreateComboProductDto } from '../dto/create-combo-product.dto';
import { CreateComboGroupDto } from '../dto/create-combo-group.dto';
import { UpdateComboGroupDto } from '../dto/update-combo-group.dto';
import { CreateComboGroupItemDto } from '../dto/create-combo-group-item.dto';
import { UpdateComboGroupItemDto } from '../dto/update-combo-group-item.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Combo Products')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('combo-products')
export class ComboProductsController {
  constructor(private readonly comboProductsService: ComboProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all combo products' })
  @Permissions('products:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.comboProductsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get combo product by ID with groups and items' })
  @Permissions('products:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.comboProductsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a combo product' })
  @Permissions('products:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateComboProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a combo product' })
  @Permissions('products:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
