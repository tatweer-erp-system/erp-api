import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
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
  @Get() @Permissions('crm:list') findAll(@TenantSlug() s: string, @Query() p: PaginationDto) {
    return this.salesOrdersService.findAll(s, p);
  }
  @Get(':id') @Permissions('crm:read') findOne(@TenantSlug() s: string, @Param('id') id: string) {
    return this.salesOrdersService.findOne(s, id);
  }
  @Post() @Permissions('crm:create') create(
    @TenantSlug() s: string,
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.salesOrdersService.create(s, dto, u.id);
  }
}
