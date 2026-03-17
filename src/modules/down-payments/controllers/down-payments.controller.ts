import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DownPaymentsService } from '../services/down-payments.service';
import { CreateDownPaymentDto } from '../dto/create-down-payment.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Sales - Down Payments')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sale-orders')
export class DownPaymentsController {
  constructor(private readonly downPaymentsService: DownPaymentsService) {}

  @Post(':id/down-payment')
  @ApiOperation({ summary: 'Create a down payment for a sales order' })
  @Permissions('sales:manage')
  create(
    @TenantId() tenantId: string,
    @Param('id') saleOrderId: string,
    @Body() dto: CreateDownPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.downPaymentsService.create(tenantId, saleOrderId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Get(':id/down-payments')
  @ApiOperation({ summary: 'List down payments for a sales order' })
  @Permissions('sales:view')
  findBySaleOrder(@TenantId() tenantId: string, @Param('id') saleOrderId: string) {
    return this.downPaymentsService.findBySaleOrder(tenantId, saleOrderId);
  }
}
