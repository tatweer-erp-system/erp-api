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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TaxesService } from '../services/taxes.service';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { TaxScope } from '@/common/enums/inventory.enums';

@ApiTags('Inventory - Taxes')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get taxes dropdown list' })
  @ApiQuery({ name: 'scope', enum: TaxScope, required: false })
  @Permissions('inventory:view')
  getDropdown(
    @TenantId() tenantId: string,
    @Query() query: DropdownQueryDto,
    @Query('scope') scope?: TaxScope,
  ) {
    return this.taxesService.getDropdown(tenantId, { ...query, scope });
  }

  @Get()
  @ApiOperation({ summary: 'List all taxes' })
  @ApiQuery({ name: 'scope', enum: TaxScope, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @Permissions('inventory:view')
  findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationDto,
    @Query('scope') scope?: TaxScope,
    @Query('isActive') isActive?: string,
  ) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.taxesService.findAll(tenantId, { ...pagination, scope, isActive: active } as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax by ID' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.taxesService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tax' })
  @Permissions('inventory:create')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTaxDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxesService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tax' })
  @Permissions('inventory:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxesService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tax' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxesService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
