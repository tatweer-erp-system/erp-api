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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PurchaseOrdersService } from '../services/purchase-orders.service';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { ReceiveItemsDto } from '../dto/receive-items.dto';
import { InvoicePurchaseOrderDto } from '../dto/invoice-purchase-order.dto';
import { CreatePurchaseOrderLineDto } from '../dto/create-purchase-order-line.dto';
import { PurchasingReportQueryDto } from '../dto/purchasing-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Purchasing - Purchase Orders')
@Controller('purchasing/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('purchasing')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @Permissions('purchasing:view')
  @ApiOperation({ summary: 'List all purchase orders' })
  @ApiOkResponse({ description: 'Paginated list of purchase orders' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.purchaseOrdersService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('purchasing:view')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order details with lines' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.findById(tenantId, id);
  }

  @Post()
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Create a new purchase order (draft)' })
  @ApiCreatedResponse({ description: 'Purchase order created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Update purchase order (draft only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/send')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Mark purchase order as sent' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order marked as sent' })
  send(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.send(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/confirm')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Confirm purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order confirmed' })
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.confirm(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/receive')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Receive items for purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Items received' })
  receive(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReceiveItemsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.receive(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/invoice')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Invoice purchase order (post AP journal)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order invoiced' })
  invoice(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: InvoicePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.invoice(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/cancel')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order cancelled' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.cancel(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Delete purchase order (draft only, soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Purchase order deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.remove(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Line management ─────────────────────────────────────────────────────

  @Post(':id/lines')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Add a line to purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Line added' })
  addLine(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreatePurchaseOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.addLine(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/lines/:lineId')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Update a line on purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'lineId', type: 'string' })
  @ApiOkResponse({ description: 'Line updated' })
  updateLine(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: CreatePurchaseOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.updateLine(tenantId, id, lineId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id/lines/:lineId')
  @Permissions('purchasing:manage')
  @ApiOperation({ summary: 'Remove a line from purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'lineId', type: 'string' })
  @ApiOkResponse({ description: 'Line removed' })
  removeLine(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.removeLine(tenantId, id, lineId, {
      userId: user.id,
      tenantId,
    });
  }
}

// ── Report Controller ──────────────────────────────────────────────────────

@ApiTags('Purchasing - Reports')
@Controller('purchasing/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('purchasing')
export class PurchasingReportsController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get('summary')
  @Permissions('purchasing:view')
  @ApiOperation({ summary: 'Get purchasing summary report' })
  @ApiOkResponse({ description: 'Purchasing summary report' })
  getSummary(@TenantId() tenantId: string, @Query() query: PurchasingReportQueryDto) {
    return this.purchaseOrdersService.getSummaryReport(tenantId, query);
  }
}
