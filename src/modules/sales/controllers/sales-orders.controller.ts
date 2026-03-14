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
import { SalesOrdersService } from '../services/sales-orders.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { CreateSalesOrderLineDto } from '../dto/create-sales-order-line.dto';
import { UpdateSalesOrderLineDto } from '../dto/update-sales-order-line.dto';
import { SalesReportQueryDto } from '../dto/sales-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Sales - Orders')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a draft sales order' })
  @Permissions('sales:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List sales orders with pagination and filters' })
  @Permissions('sales:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.salesOrdersService.findAll(tenantId, pagination);
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Sales summary report — totals, breakdowns by status/branch/currency' })
  @Permissions('sales:view')
  getSalesSummary(@TenantId() tenantId: string, @Query() query: SalesReportQueryDto) {
    return this.salesOrdersService.getSalesSummary(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sales order by ID with lines' })
  @Permissions('sales:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft sales order' })
  @Permissions('sales:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  // ── Status transitions ──────────────────────────────────────────────────────

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a draft sales order — locks exchange rate' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.confirm(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales order (draft or confirmed only)' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.cancel(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Line management ─────────────────────────────────────────────────────────

  @Post(':id/lines')
  @ApiOperation({ summary: 'Add a line to a draft sales order' })
  @Permissions('sales:manage')
  addLine(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: CreateSalesOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.addLine(tenantId, orderId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/lines/:lineId')
  @ApiOperation({ summary: 'Update a line on a draft sales order' })
  @Permissions('sales:manage')
  updateLine(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateSalesOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.updateLine(tenantId, orderId, lineId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id/lines/:lineId')
  @ApiOperation({ summary: 'Remove a line from a draft sales order' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  removeLine(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.removeLine(tenantId, orderId, lineId, {
      userId: user.id,
      tenantId,
    });
  }
}
