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
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('CRM - Sales Orders')
@ApiBearerAuth()
@ModuleFeature('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm/sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all sales orders' })
  @Permissions('crm:read')
  findAll(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.salesOrdersService.findAll(slug, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order by ID (includes lines)' })
  @Permissions('crm:read')
  findById(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.salesOrdersService.findById(slug, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a sales order with ZATCA fields' })
  @Permissions('crm:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.create(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a sales order (draft only)' })
  @Permissions('crm:update')
  update(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.update(slug, id, dto, { userId: user.id, tenantSlug: slug });
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a sales order (draft -> confirmed)' })
  @Permissions('crm:update')
  confirm(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.confirm(slug, id, { userId: user.id, tenantSlug: slug });
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Ship a sales order (confirmed/in_progress -> shipped)' })
  @Permissions('crm:update')
  ship(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.ship(slug, id, { userId: user.id, tenantSlug: slug });
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Deliver a sales order (shipped -> delivered)' })
  @Permissions('crm:update')
  deliver(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.deliver(slug, id, { userId: user.id, tenantSlug: slug });
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales order (draft/confirmed -> cancelled)' })
  @Permissions('crm:update')
  cancel(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.cancel(slug, id, { userId: user.id, tenantSlug: slug });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sales order (draft only)' })
  @Permissions('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.remove(slug, id, { userId: user.id, tenantSlug: slug });
  }
}
