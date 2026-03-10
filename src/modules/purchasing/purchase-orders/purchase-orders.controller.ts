import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('Purchasing - Purchase Orders')
@ApiBearerAuth()
@ModuleFeature('purchasing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchasing/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}
  @Get() @Permissions('purchasing:list') findAll(
    @TenantSlug() s: string,
    @Query() p: PaginationDto,
  ) {
    return this.purchaseOrdersService.findAll(s, p);
  }
  @Get(':id') @Permissions('purchasing:read') findOne(
    @TenantSlug() s: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrdersService.findOne(s, id);
  }
  @Post() @Permissions('purchasing:create') create(
    @TenantSlug() s: string,
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.create(s, dto, u.id);
  }
}
