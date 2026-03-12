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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { SubscriptionsService } from '../services/subscriptions.service';
import {
  InitiatePaymentDto,
  UpgradeSubscriptionDto,
  ExtendTrialDto,
} from '../dto/create-subscription.dto';
import { ToggleAutoRenewalDto } from '../dto/toggle-auto-renewal.dto';
import { AdminChangePlanDto } from '../dto/admin-change-plan.dto';
import { RetryPaymentDto } from '../dto/retry-payment.dto';
import { UpdatePaymentMethodDto } from '../dto/update-payment-method.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ── Superadmin: list all subscriptions ────────────────────────────────────
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Get()
  @ApiOperation({ summary: 'Superadmin: list all subscriptions (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'planSlug', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiQuery({ name: 'expiresWithinDays', required: false })
  @ApiQuery({ name: 'overdue', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('planSlug') planSlug?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('expiresWithinDays') expiresWithinDays?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.subscriptionsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      planSlug,
      sortBy,
      sortOrder,
      expiresWithinDays: expiresWithinDays ? Number(expiresWithinDays) : undefined,
      overdue: overdue === 'true',
    });
  }

  // ── Superadmin: subscription analytics ──────────────────────────────────────
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Get('analytics')
  @ApiOperation({ summary: 'Superadmin: get subscription analytics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false })
  getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.subscriptionsService.getAnalytics({ startDate, endDate, groupBy });
  }

  /** Get the current tenant's subscription */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: "Get current tenant's subscription" })
  getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.findByTenant(user.tenantId);
  }

  // ── Superadmin: get single subscription by ID ─────────────────────────────
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Superadmin: get subscription by ID' })
  findById(@Param('id') id: string) {
    return this.subscriptionsService.findById(id);
  }

  /** Initiate payment — returns a Moyasar payment URL */
  @UseGuards(JwtAuthGuard)
  @Post('pay')
  @ApiOperation({ summary: 'Initiate payment and get payment URL' })
  initiatePayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto) {
    return this.subscriptionsService.initiatePayment(user.tenantId, dto);
  }

  /** Moyasar redirects here after payment */
  @Public()
  @Get('payment/callback')
  @ApiOperation({ summary: 'Moyasar payment callback (do not call directly)' })
  @ApiQuery({ name: 'id', required: true })
  @ApiQuery({ name: 'status', required: false })
  async paymentCallback(@Query('id') transactionId: string, @Res() res: Response) {
    const result = await this.subscriptionsService.handlePaymentCallback(transactionId);
    if (result.redirectUrl) {
      const separator = result.redirectUrl.includes('?') ? '&' : '?';
      return res.redirect(`${result.redirectUrl}${separator}success=${result.success}`);
    }
    return res.json({ success: result.success });
  }

  /** Upgrade or change plan — initiates a new payment */
  @UseGuards(JwtAuthGuard)
  @Patch('upgrade')
  @ApiOperation({ summary: 'Upgrade or change subscription plan' })
  upgrade(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpgradeSubscriptionDto) {
    return this.subscriptionsService.upgrade(user.tenantId, dto);
  }

  /** Cancel subscription */
  @UseGuards(JwtAuthGuard)
  @Delete('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription' })
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancel(user.tenantId);
  }

  /** Get payment history */
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiOperation({ summary: 'Get payment transaction history' })
  getTransactions(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getTransactions(user.tenantId);
  }

  // ── Superadmin endpoints ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Post('admin/activate')
  @ApiOperation({ summary: 'Superadmin: manually activate a subscription' })
  adminActivate(
    @Body('tenantId') tenantId: string,
    @Body('planSlug') planSlug: string,
    @Body('billingCycle') billingCycle: 'monthly' | 'annual',
  ) {
    return this.subscriptionsService.adminActivate(tenantId, planSlug, billingCycle);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Patch('admin/extend-trial')
  @ApiOperation({
    summary: 'Superadmin: extend or restart trial period',
    description:
      'If the tenant is currently in trial, extends from the current end date. ' +
      'If expired, cancelled, or past_due, restarts the trial from now.',
  })
  adminExtendTrial(@Body() dto: ExtendTrialDto) {
    return this.subscriptionsService.adminExtendTrial(dto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Delete('admin/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Superadmin: cancel a subscription for a specific tenant' })
  adminCancel(@Body('tenantId') tenantId: string) {
    return this.subscriptionsService.cancel(tenantId);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Patch('admin/auto-renewal')
  @ApiOperation({ summary: 'Superadmin: toggle auto-renewal for a subscription' })
  toggleAutoRenewal(@Body() dto: ToggleAutoRenewalDto) {
    return this.subscriptionsService.toggleAutoRenewal(dto.tenantId, dto.autoRenewal);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Patch('admin/change-plan')
  @ApiOperation({ summary: 'Superadmin: change subscription plan (upgrade or downgrade)' })
  adminChangePlan(@Body() dto: AdminChangePlanDto) {
    return this.subscriptionsService.adminChangePlan(dto.tenantId, dto.planSlug, dto.billingCycle);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Post('admin/retry-payment')
  @ApiOperation({ summary: 'Superadmin: retry payment for a past_due/expired subscription' })
  adminRetryPayment(@Body() dto: RetryPaymentDto) {
    return this.subscriptionsService.adminRetryPayment(dto.tenantId);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Patch('admin/payment-method')
  @ApiOperation({ summary: 'Superadmin: update payment method for a tenant' })
  updatePaymentMethod(@Body() dto: UpdatePaymentMethodDto) {
    return this.subscriptionsService.updatePaymentMethod(
      dto.tenantId,
      dto.paymentToken,
      dto.cardLastFour,
      dto.cardBrand,
      dto.cardExpiry,
    );
  }
}
