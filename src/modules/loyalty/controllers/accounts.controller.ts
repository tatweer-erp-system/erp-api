import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoyaltyEngineService } from '../services/loyalty-engine.service';
import { AdjustPointsDto } from '../dto/adjust-points.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Loyalty - Accounts')
@ApiBearerAuth()
@ModuleFeature('loyalty')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('loyalty/accounts')
export class AccountsController {
  constructor(private readonly loyaltyEngineService: LoyaltyEngineService) {}

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get loyalty account by customer ID' })
  @Permissions('loyalty:read')
  getByCustomer(@TenantId() tenantId: string, @Param('customerId') customerId: string) {
    return this.loyaltyEngineService.getAccountByCustomer(tenantId, customerId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get transaction history for a loyalty account' })
  @Permissions('loyalty:read')
  getHistory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.loyaltyEngineService.getTransactionHistory(tenantId, id, pagination);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Manually adjust loyalty points' })
  @Permissions('loyalty:manage')
  adjustPoints(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AdjustPointsDto,
  ) {
    return this.loyaltyEngineService.adjustPoints(tenantId, id, dto);
  }
}
