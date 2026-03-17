import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReceiptsService } from '../services/receipts.service';
import { CreateReceiptDto } from '../dto/create-receipt.dto';
import { UpdateReceiptDto } from '../dto/update-receipt.dto';
import { ReceiptQueryDto } from '../dto/receipt-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Receipts')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  @ApiOperation({ summary: 'List receipts' })
  @Permissions('inventory:view')
  findAll(@TenantId() tenantId: string, @Query() query: ReceiptQueryDto) {
    return this.receiptsService.findAll(tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a receipt' })
  @Permissions('inventory:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiptsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receipt with lines' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.receiptsService.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft receipt' })
  @Permissions('inventory:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiptsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate receipt — creates stock moves and updates stock levels' })
  @Permissions('inventory:manage')
  validate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiptsService.validate(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a receipt' })
  @Permissions('inventory:manage')
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiptsService.cancel(tenantId, id, { userId: user.id, tenantId });
  }
}
