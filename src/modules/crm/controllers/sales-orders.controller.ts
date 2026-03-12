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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesOrdersService } from '../services/sales-orders.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('CRM - Sales Orders')
@ApiBearerAuth()
@ModuleFeature('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all sales orders' })
  @Permissions('crm:read')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.salesOrdersService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order by ID (includes lines)' })
  @Permissions('crm:read')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a sales order with ZATCA fields' })
  @Permissions('crm:create')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // orderNumber is stripped in the service — never accepted from user input
    return this.salesOrdersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a sales order (draft only)' })
  @Permissions('crm:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a sales order (draft -> confirmed)' })
  @Permissions('crm:update')
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.confirm(tenantId, id, { userId: user.id, tenantId });
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Ship a sales order (confirmed/in_progress -> shipped)' })
  @Permissions('crm:update')
  ship(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.ship(tenantId, id, { userId: user.id, tenantId });
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Deliver a sales order (shipped -> delivered)' })
  @Permissions('crm:update')
  deliver(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.deliver(tenantId, id, { userId: user.id, tenantId });
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales order (draft/confirmed -> cancelled)' })
  @Permissions('crm:update')
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.cancel(tenantId, id, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sales order (draft only)' })
  @Permissions('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrdersService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
