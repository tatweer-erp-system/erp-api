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
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { PurchasingService } from '../services/purchasing.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import {
  PurchaseOrderStatus,
  PurchaseBillStatus,
  PurchaseReceiptStatus,
} from '@/common/enums/purchasing.enums';

@ApiTags('Purchasing V2 - Purchase Orders')
@Controller('v2/purchase-orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PurchaseOrdersV2Controller {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Get()
  @ApiOperation({ summary: 'List purchase orders for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true, description: 'Branch UUID' })
  @ApiOkResponse({ description: 'Paginated list of purchase orders' })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: PurchaseOrderStatus,
    @Query('vendorId') vendorId?: string,
    @Query('invoiceStatus') invoiceStatus?: PurchaseBillStatus,
    @Query('receiptStatus') receiptStatus?: PurchaseReceiptStatus,
    @Query('search') search?: string,
  ) {
    return this.purchasingService.findAllOrders(
      branchId,
      { status, vendorId, invoiceStatus, receiptStatus, search },
      +page,
      +limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order' })
  findById(@Param('id') id: string) {
    return this.purchasingService.findOrderById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get purchase order with its lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order with lines' })
  findWithLines(@Param('id') id: string) {
    return this.purchasingService.findOrderWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiCreatedResponse({ description: 'Purchase order created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasingService.createOrder({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.purchasingService.updateOrder(id, version, { ...data, updatedBy: user.id });
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert lines on a purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Lines upserted' })
  upsertLines(@Param('id') id: string, @Body() body: { lines: Record<string, any>[] }) {
    return this.purchasingService.upsertOrderLines(id, body.lines as any);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order confirmed' })
  confirm(@Param('id') id: string) {
    return this.purchasingService.confirmOrder(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order cancelled' })
  cancel(@Param('id') id: string) {
    return this.purchasingService.cancelOrder(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete purchase order (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Purchase order deleted' })
  remove(@Param('id') id: string) {
    return this.purchasingService.deleteOrder(id);
  }
}
