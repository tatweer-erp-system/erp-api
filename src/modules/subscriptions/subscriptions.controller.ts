import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import {
  InitiatePaymentDto,
  UpgradeSubscriptionDto,
  ExtendTrialDto,
} from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '../../common/guards/super-admin-ip.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** Get the current tenant's subscription */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: "Get current tenant's subscription" })
  getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.findByTenant(user.tenantId);
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
}
