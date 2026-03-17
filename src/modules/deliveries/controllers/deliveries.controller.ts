import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliveriesService } from '../services/deliveries.service';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { UpdateDeliveryDto } from '../dto/update-delivery.dto';
import { DeliveryQueryDto } from '../dto/delivery-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Deliveries')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @ApiOperation({ summary: 'List deliveries' })
  @Permissions('inventory:view')
  findAll(@TenantId() tenantId: string, @Query() query: DeliveryQueryDto) {
    return this.deliveriesService.findAll(tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a delivery' })
  @Permissions('inventory:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateDeliveryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveriesService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery with lines' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.deliveriesService.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft delivery' })
  @Permissions('inventory:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveriesService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate delivery — creates stock moves and updates stock levels' })
  @Permissions('inventory:manage')
  validate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveriesService.validate(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a delivery' })
  @Permissions('inventory:manage')
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveriesService.cancel(tenantId, id, { userId: user.id, tenantId });
  }
}
