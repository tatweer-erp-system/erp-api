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
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Purchasing - Purchase Orders')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('purchasing')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @Permissions('purchasing:read')
  @ApiOperation({ summary: 'List all purchase orders' })
  @ApiOkResponse({ description: 'Paginated list of purchase orders' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.purchaseOrdersService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('purchasing:read')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order details with lines' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.findById(tenantId, id);
  }

  @Post()
  @Permissions('purchasing:create')
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiCreatedResponse({ description: 'Purchase order created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // orderNumber is stripped in the service — never accepted from user input
    return this.purchaseOrdersService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('purchasing:update')
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

  @Patch(':id/approve')
  @Permissions('purchasing:update')
  @ApiOperation({ summary: 'Approve purchase order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Purchase order approved' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.approve(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch(':id/receive')
  @Permissions('purchasing:update')
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

  @Patch(':id/cancel')
  @Permissions('purchasing:update')
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
  @Permissions('purchasing:delete')
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
}
