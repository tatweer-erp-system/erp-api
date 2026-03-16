import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PurchasingDefinitionsService } from '../services/purchasing-definitions.service';
import { CreatePaymentTermDto } from '../dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from '../dto/update-payment-term.dto';
import { CreateRejectionReasonDto } from '../dto/create-rejection-reason.dto';
import { UpdateRejectionReasonDto } from '../dto/update-rejection-reason.dto';

@ApiTags('Purchases Definitions')
@Controller('purchasing/definitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('purchasing')
export class PurchasingDefinitionsController {
  constructor(private readonly service: PurchasingDefinitionsService) {}

  // ─── Payment Terms ────────────────────────────────────────────────────

  @Get('payment-terms')
  @Permissions('purchasing:view')
  @ApiOperation({ summary: 'List all payment terms' })
  findAllPaymentTerms(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.service.findAllPaymentTerms(tenantId, pagination);
  }

  @Get('payment-terms/:id')
  @Permissions('purchasing:view')
  @ApiOperation({ summary: 'Get payment term by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findPaymentTermById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findPaymentTermById(tenantId, id);
  }

  @Post('payment-terms')
  @Permissions('purchasing:create')
  @ApiOperation({ summary: 'Create a new payment term' })
  createPaymentTerm(
    @TenantId() tenantId: string,
    @Body() dto: CreatePaymentTermDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createPaymentTerm(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch('payment-terms/:id')
  @Permissions('purchasing:update')
  @ApiOperation({ summary: 'Update a payment term' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updatePaymentTerm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTermDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updatePaymentTerm(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete('payment-terms/:id')
  @Permissions('purchasing:delete')
  @ApiOperation({ summary: 'Soft delete a payment term' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removePaymentTerm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removePaymentTerm(tenantId, id, { userId: user.id, tenantId });
  }

  // ─── Rejection Reasons ────────────────────────────────────────────────

  @Get('rejection-reasons')
  @Permissions('purchasing:view')
  @ApiOperation({ summary: 'List all rejection reasons' })
  findAllRejectionReasons(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.service.findAllRejectionReasons(tenantId, pagination);
  }

  @Get('rejection-reasons/:id')
  @Permissions('purchasing:view')
  @ApiOperation({ summary: 'Get rejection reason by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findRejectionReasonById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findRejectionReasonById(tenantId, id);
  }

  @Post('rejection-reasons')
  @Permissions('purchasing:create')
  @ApiOperation({ summary: 'Create a new rejection reason' })
  createRejectionReason(
    @TenantId() tenantId: string,
    @Body() dto: CreateRejectionReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createRejectionReason(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch('rejection-reasons/:id')
  @Permissions('purchasing:update')
  @ApiOperation({ summary: 'Update a rejection reason' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateRejectionReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRejectionReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateRejectionReason(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete('rejection-reasons/:id')
  @Permissions('purchasing:delete')
  @ApiOperation({ summary: 'Soft delete a rejection reason' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRejectionReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeRejectionReason(tenantId, id, { userId: user.id, tenantId });
  }
}
