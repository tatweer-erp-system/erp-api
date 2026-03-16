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
import { SalesOpsService } from '../services/sales-ops.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { SalesOrderStatus, SalesInvoiceStatus } from '@/common/enums/sales.enums';

class CreateSalesOrderOpsDto {
  branchId: string;
  customerId: string;
  pricelistId?: string;
  salespersonId?: string;
  paymentTermId?: string;
  reference?: string;
  expiryDate?: Date;
  notes?: string;
  untaxedAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
}

class UpdateSalesOrderOpsDto extends CreateSalesOrderOpsDto {
  version: number;
}

class SalesOrderLineOpsDto {
  productId: string;
  description?: string;
  qty: number;
  uomId?: string;
  unitPrice?: number;
  discountPercent?: number;
  taxId?: string;
  subtotal?: number;
  sequence?: number;
}

@ApiTags('Sales - Orders (Ops)')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/orders-ops')
export class SalesOrdersOpsController {
  constructor(private readonly salesOpsService: SalesOpsService) {}

  @Get()
  @ApiOperation({ summary: 'List sales orders' })
  @Permissions('sales:view')
  findAll(
    @Query('branchId') branchId: string,
    @Query('status') status?: SalesOrderStatus,
    @Query('customerId') customerId?: string,
    @Query('invoiceStatus') invoiceStatus?: SalesInvoiceStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.salesOpsService.findAllOrders(
      branchId,
      { status, customerId, invoiceStatus },
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sales order by ID' })
  @Permissions('sales:view')
  findById(@Param('id') id: string) {
    return this.salesOpsService.findOrderById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get a sales order with its lines' })
  @Permissions('sales:view')
  findWithLines(@Param('id') id: string) {
    return this.salesOpsService.findOrderWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft sales order' })
  @Permissions('sales:manage')
  create(@Body() dto: CreateSalesOrderOpsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesOpsService.createOrder({ ...dto, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a sales order' })
  @Permissions('sales:manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderOpsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = dto;
    return this.salesOpsService.updateOrder(id, version, { ...data, updatedBy: user.id });
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert lines on a sales order' })
  @Permissions('sales:manage')
  upsertLines(@Param('id') id: string, @Body() lines: SalesOrderLineOpsDto[]) {
    return this.salesOpsService.upsertOrderLines(id, lines);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a sales order' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id') id: string) {
    return this.salesOpsService.confirmOrder(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales order' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.salesOpsService.cancelOrder(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sales order' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.salesOpsService.removeOrder(id);
  }
}
