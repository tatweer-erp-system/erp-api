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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosOrdersService } from '../services/orders.service';
import { OrderItemsService } from '../services/order-items.service';
import { PosCheckoutService } from '../services/checkout.service';
import { RefundsService } from '../services/refunds.service';
import { PosSyncService } from '../services/pos-sync.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { AddOrderItemDto } from '../dto/add-order-item.dto';
import { UpdateOrderItemDto } from '../dto/update-order-item.dto';
import { CheckoutDto } from '../dto/checkout.dto';
import { RefundOrderDto } from '../dto/refund-order.dto';
import { HoldOrderDto } from '../dto/hold-order.dto';
import { SyncBatchDto } from '../dto/sync-batch.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('POS - Orders')
@ApiBearerAuth()
@ModuleFeature('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: PosOrdersService,
    private readonly orderItemsService: OrderItemsService,
    private readonly checkoutService: PosCheckoutService,
    private readonly refundsService: RefundsService,
    private readonly syncService: PosSyncService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new POS order' })
  @Permissions('pos:orders')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List POS orders' })
  @Permissions('pos:orders')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.ordersService.findAll(tenantId, pagination);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync offline POS orders' })
  @Permissions('pos:session')
  @HttpCode(HttpStatus.OK)
  sync(
    @TenantId() tenantId: string,
    @Body() dto: SyncBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.syncBatch(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get('held')
  @ApiOperation({ summary: 'List held orders for current session' })
  @Permissions('pos:orders')
  listHeld(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listHeldOrders(tenantId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details with items and payments' })
  @Permissions('pos:orders')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order metadata' })
  @Permissions('pos:orders')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Void an order' })
  @Permissions('pos:orders')
  @HttpCode(HttpStatus.NO_CONTENT)
  voidOrder(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.voidOrder(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to an order' })
  @Permissions('pos:orders')
  addItem(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: AddOrderItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderItemsService.addItem(tenantId, orderId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update an order item' })
  @Permissions('pos:orders')
  updateItem(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderItemsService.updateItem(tenantId, orderId, itemId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from an order' })
  @Permissions('pos:orders')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderItemsService.removeItem(tenantId, orderId, itemId, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Checkout an order' })
  @Permissions('pos:orders')
  checkout(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checkoutService.checkout(tenantId, orderId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund an order' })
  @Permissions('pos:orders')
  refund(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: RefundOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.refundsService.refundOrder(tenantId, orderId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Hold an order' })
  @Permissions('pos:orders')
  holdOrder(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: HoldOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.holdOrder(tenantId, orderId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post('held/:id/resume')
  @ApiOperation({ summary: 'Resume a held order' })
  @Permissions('pos:orders')
  resumeHeld(
    @TenantId() tenantId: string,
    @Param('id') heldOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.resumeHeldOrder(tenantId, heldOrderId, {
      userId: user.id,
      tenantId,
    });
  }
}
