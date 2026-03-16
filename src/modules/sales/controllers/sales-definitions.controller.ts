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
import { SalesDefinitionsService } from '../services/sales-definitions.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { CreateVoucherTypeDto } from '../dto/create-voucher-type.dto';
import { UpdateVoucherTypeDto } from '../dto/update-voucher-type.dto';
import { CreateReceiptTemplateDto } from '../dto/create-receipt-template.dto';
import { UpdateReceiptTemplateDto } from '../dto/update-receipt-template.dto';
import { CreateCancellationReasonDto } from '../dto/create-cancellation-reason.dto';
import { UpdateCancellationReasonDto } from '../dto/update-cancellation-reason.dto';
import { CreateVoidRefundReasonDto } from '../dto/create-void-refund-reason.dto';
import { UpdateVoidRefundReasonDto } from '../dto/update-void-refund-reason.dto';
import { CreateDiscountReasonDto } from '../dto/create-discount-reason.dto';
import { UpdateDiscountReasonDto } from '../dto/update-discount-reason.dto';
import { CreateHoldReasonDto } from '../dto/create-hold-reason.dto';
import { UpdateHoldReasonDto } from '../dto/update-hold-reason.dto';

@ApiTags('Sales Definitions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/definitions')
export class SalesDefinitionsController {
  constructor(private readonly salesDefinitionsService: SalesDefinitionsService) {}

  // ── Voucher Types ──────────────────────────────────────────────────────────

  @Get('voucher-types')
  @ApiOperation({ summary: 'List all voucher type configurations' })
  @Permissions('sales:view')
  findAllVoucherTypes(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.salesDefinitionsService.findAllVoucherTypes(tenantId, query);
  }

  @Get('voucher-types/:id')
  @ApiOperation({ summary: 'Get a voucher type configuration by ID' })
  @Permissions('sales:view')
  findVoucherTypeById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesDefinitionsService.findVoucherTypeById(tenantId, id);
  }

  @Post('voucher-types')
  @ApiOperation({ summary: 'Create a voucher type configuration' })
  @Permissions('sales:create')
  createVoucherType(
    @TenantId() tenantId: string,
    @Body() dto: CreateVoucherTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.createVoucherType(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('voucher-types/:id')
  @ApiOperation({ summary: 'Update a voucher type configuration' })
  @Permissions('sales:update')
  updateVoucherType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVoucherTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.updateVoucherType(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('voucher-types/:id')
  @ApiOperation({ summary: 'Delete a voucher type configuration' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.OK)
  deleteVoucherType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.deleteVoucherType(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Receipt Templates ──────────────────────────────────────────────────────

  @Get('receipt-templates')
  @ApiOperation({ summary: 'List all receipt templates' })
  @Permissions('sales:view')
  findAllReceiptTemplates(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.salesDefinitionsService.findAllReceiptTemplates(tenantId, query);
  }

  @Get('receipt-templates/:id')
  @ApiOperation({ summary: 'Get a receipt template by ID' })
  @Permissions('sales:view')
  findReceiptTemplateById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesDefinitionsService.findReceiptTemplateById(tenantId, id);
  }

  @Post('receipt-templates')
  @ApiOperation({ summary: 'Create a receipt template' })
  @Permissions('sales:create')
  createReceiptTemplate(
    @TenantId() tenantId: string,
    @Body() dto: CreateReceiptTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.createReceiptTemplate(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('receipt-templates/:id')
  @ApiOperation({ summary: 'Update a receipt template' })
  @Permissions('sales:update')
  updateReceiptTemplate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReceiptTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.updateReceiptTemplate(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('receipt-templates/:id')
  @ApiOperation({ summary: 'Delete a receipt template' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.OK)
  deleteReceiptTemplate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.deleteReceiptTemplate(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Cancellation Reasons ───────────────────────────────────────────────────

  @Get('cancellation-reasons')
  @ApiOperation({ summary: 'List all cancellation reasons' })
  @Permissions('sales:view')
  findAllCancellationReasons(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.salesDefinitionsService.findAllCancellationReasons(tenantId, query);
  }

  @Get('cancellation-reasons/:id')
  @ApiOperation({ summary: 'Get a cancellation reason by ID' })
  @Permissions('sales:view')
  findCancellationReasonById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesDefinitionsService.findCancellationReasonById(tenantId, id);
  }

  @Post('cancellation-reasons')
  @ApiOperation({ summary: 'Create a cancellation reason' })
  @Permissions('sales:create')
  createCancellationReason(
    @TenantId() tenantId: string,
    @Body() dto: CreateCancellationReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.createCancellationReason(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('cancellation-reasons/:id')
  @ApiOperation({ summary: 'Update a cancellation reason' })
  @Permissions('sales:update')
  updateCancellationReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCancellationReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.updateCancellationReason(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('cancellation-reasons/:id')
  @ApiOperation({ summary: 'Delete a cancellation reason' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.OK)
  deleteCancellationReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.deleteCancellationReason(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Void/Refund Reasons ────────────────────────────────────────────────────

  @Get('void-refund-reasons')
  @ApiOperation({ summary: 'List all void/refund reasons' })
  @Permissions('sales:view')
  findAllVoidRefundReasons(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.salesDefinitionsService.findAllVoidRefundReasons(tenantId, query);
  }

  @Get('void-refund-reasons/:id')
  @ApiOperation({ summary: 'Get a void/refund reason by ID' })
  @Permissions('sales:view')
  findVoidRefundReasonById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesDefinitionsService.findVoidRefundReasonById(tenantId, id);
  }

  @Post('void-refund-reasons')
  @ApiOperation({ summary: 'Create a void/refund reason' })
  @Permissions('sales:create')
  createVoidRefundReason(
    @TenantId() tenantId: string,
    @Body() dto: CreateVoidRefundReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.createVoidRefundReason(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('void-refund-reasons/:id')
  @ApiOperation({ summary: 'Update a void/refund reason' })
  @Permissions('sales:update')
  updateVoidRefundReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVoidRefundReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.updateVoidRefundReason(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('void-refund-reasons/:id')
  @ApiOperation({ summary: 'Delete a void/refund reason' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.OK)
  deleteVoidRefundReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.deleteVoidRefundReason(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Discount Reasons ───────────────────────────────────────────────────────

  @Get('discount-reasons')
  @ApiOperation({ summary: 'List all discount reasons' })
  @Permissions('sales:view')
  findAllDiscountReasons(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.salesDefinitionsService.findAllDiscountReasons(tenantId, query);
  }

  @Get('discount-reasons/:id')
  @ApiOperation({ summary: 'Get a discount reason by ID' })
  @Permissions('sales:view')
  findDiscountReasonById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesDefinitionsService.findDiscountReasonById(tenantId, id);
  }

  @Post('discount-reasons')
  @ApiOperation({ summary: 'Create a discount reason' })
  @Permissions('sales:create')
  createDiscountReason(
    @TenantId() tenantId: string,
    @Body() dto: CreateDiscountReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.createDiscountReason(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('discount-reasons/:id')
  @ApiOperation({ summary: 'Update a discount reason' })
  @Permissions('sales:update')
  updateDiscountReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDiscountReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.updateDiscountReason(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('discount-reasons/:id')
  @ApiOperation({ summary: 'Delete a discount reason' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.OK)
  deleteDiscountReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.deleteDiscountReason(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Hold Reasons ───────────────────────────────────────────────────────────

  @Get('hold-reasons')
  @ApiOperation({ summary: 'List all hold reasons' })
  @Permissions('sales:view')
  findAllHoldReasons(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.salesDefinitionsService.findAllHoldReasons(tenantId, query);
  }

  @Get('hold-reasons/:id')
  @ApiOperation({ summary: 'Get a hold reason by ID' })
  @Permissions('sales:view')
  findHoldReasonById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesDefinitionsService.findHoldReasonById(tenantId, id);
  }

  @Post('hold-reasons')
  @ApiOperation({ summary: 'Create a hold reason' })
  @Permissions('sales:create')
  createHoldReason(
    @TenantId() tenantId: string,
    @Body() dto: CreateHoldReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.createHoldReason(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('hold-reasons/:id')
  @ApiOperation({ summary: 'Update a hold reason' })
  @Permissions('sales:update')
  updateHoldReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHoldReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.updateHoldReason(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('hold-reasons/:id')
  @ApiOperation({ summary: 'Delete a hold reason' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.OK)
  deleteHoldReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesDefinitionsService.deleteHoldReason(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
