import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Subscription } from './entities/subscription.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Plan } from './entities/plan.entity';
import { PlansService } from './plans.service';
import { PaymentService } from './payment.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import {
  InitiatePaymentDto,
  UpgradeSubscriptionDto,
  ExtendTrialDto,
} from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription) private readonly subscriptionModel: typeof Subscription,
    @InjectModel(PaymentTransaction) private readonly txModel: typeof PaymentTransaction,
    private readonly plansService: PlansService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  /** Called during tenant provisioning — creates a 14-day trial on starter plan */
  async createTrial(tenantId: string): Promise<Subscription> {
    const trialDays = this.configService.get<number>('payment.trialDays') ?? 14;
    const starterPlan = await this.plansService.findBySlug('starter');

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.subscriptionModel.create({
      tenantId,
      planId: starterPlan.id,
      status: 'trial',
      billingCycle: 'monthly',
      trialEndsAt,
    } as Partial<Subscription>);
  }

  async findByTenant(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionModel.findOne({
      where: { tenantId },
      include: [{ model: Plan }],
    });
  }

  async getSubscriptionModules(tenantSlug: string, tenantId: string): Promise<string[]> {
    const cacheKey = `sub:modules:${tenantId}`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const subscription = await this.subscriptionModel.findOne({
      where: { tenantId },
      include: [{ model: Plan }],
    });

    if (!subscription || !['trial', 'active'].includes(subscription.status)) {
      await this.cacheService.set(cacheKey, [], 300);
      return [];
    }

    // If trial expired, deny access
    if (
      subscription.status === 'trial' &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt < new Date()
    ) {
      await subscription.update({ status: 'expired' });
      await this.cacheService.set(cacheKey, [], 300);
      return [];
    }

    const modules = subscription.plan?.modules ?? [];
    await this.cacheService.set(cacheKey, modules, 300);
    return modules;
  }

  async initiatePayment(
    tenantId: string,
    dto: InitiatePaymentDto,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    const plan = await this.plansService.findBySlug(dto.planSlug);
    const subscription = await this.findByTenant(tenantId);

    if (!subscription) throw new BadRequestException('No subscription found for this tenant');

    const amount = dto.billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
    const amountInHalalas = Math.round(amount * 100);

    const callbackUrl = this.configService.get<string>('payment.moyasar.callbackUrl')!;

    const result = await this.paymentService.createPayment({
      amount: amountInHalalas,
      currency: plan.currency,
      description: `${plan.name.en} plan — ${dto.billingCycle}`,
      callbackUrl,
      metadata: {
        tenantId,
        planId: plan.id,
        subscriptionId: subscription.id,
        billingCycle: dto.billingCycle,
        frontendRedirectUrl: dto.frontendRedirectUrl ?? '',
      },
    });

    // Record the pending transaction
    await this.txModel.create({
      subscriptionId: subscription.id,
      tenantId,
      amount,
      currency: plan.currency,
      status: 'pending',
      provider: this.paymentService.providerName,
      providerTransactionId: result.transactionId,
      providerResponse: result.raw,
    } as Partial<PaymentTransaction>);

    if (!result.paymentUrl) {
      throw new BadRequestException('Payment provider did not return a payment URL');
    }

    return { paymentUrl: result.paymentUrl, transactionId: result.transactionId };
  }

  /** Called by the payment callback endpoint after Moyasar redirects */
  async handlePaymentCallback(
    providerTransactionId: string,
  ): Promise<{ success: boolean; redirectUrl?: string }> {
    const verification = await this.paymentService.verifyPayment(providerTransactionId);

    const tx = await this.txModel.findOne({ where: { providerTransactionId } });
    if (!tx) {
      this.logger.warn(`Payment callback for unknown transaction: ${providerTransactionId}`);
      return { success: false };
    }

    await tx.update({
      status: verification.status === 'paid' ? 'paid' : 'failed',
      providerResponse: verification.raw,
    });

    if (verification.status === 'paid') {
      await this.activateSubscription(tx.subscriptionId, tx.tenantId, verification.raw);
    }

    const frontendRedirectUrl = (verification.raw?.metadata as Record<string, string>)
      ?.frontendRedirectUrl;
    return { success: verification.status === 'paid', redirectUrl: frontendRedirectUrl };
  }

  async upgrade(
    tenantId: string,
    dto: UpgradeSubscriptionDto,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    return this.initiatePayment(tenantId, {
      planSlug: dto.planSlug,
      billingCycle: dto.billingCycle,
    });
  }

  async cancel(tenantId: string): Promise<Subscription> {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');

    await subscription.update({ status: 'cancelled', cancelledAt: new Date() });
    await this.invalidateCache(subscription.tenantId);
    return subscription;
  }

  async getTransactions(tenantId: string): Promise<PaymentTransaction[]> {
    return this.txModel.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']],
    });
  }

  /** Superadmin: manually activate a subscription */
  async adminActivate(
    tenantId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'annual',
  ): Promise<Subscription> {
    const plan = await this.plansService.findBySlug(planSlug);
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');

    const periodStart = new Date();
    const periodEnd = new Date();
    billingCycle === 'annual'
      ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      : periodEnd.setMonth(periodEnd.getMonth() + 1);

    await subscription.update({
      planId: plan.id,
      status: 'active',
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });
    await this.invalidateCache(tenantId);
    return subscription.reload({ include: [Plan] });
  }

  private async activateSubscription(
    subscriptionId: string,
    tenantId: string,
    raw: Record<string, unknown>,
  ): Promise<void> {
    const metadata = raw?.metadata as Record<string, string> | undefined;
    const planId = metadata?.planId;
    const billingCycle = (metadata?.billingCycle as 'monthly' | 'annual') ?? 'monthly';

    const subscription = await this.subscriptionModel.findByPk(subscriptionId);
    if (!subscription) return;

    const periodStart = new Date();
    const periodEnd = new Date();
    billingCycle === 'annual'
      ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      : periodEnd.setMonth(periodEnd.getMonth() + 1);

    await subscription.update({
      planId: planId ?? subscription.planId,
      status: 'active',
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    await this.invalidateCache(tenantId);
    this.logger.log(`Subscription activated for tenant ${tenantId} — plan ${planId}`);
  }

  /** Superadmin: extend or restart trial period */
  async adminExtendTrial(dto: ExtendTrialDto): Promise<Subscription> {
    const subscription = await this.findByTenant(dto.tenantId);
    if (!subscription) throw new NotFoundException('No subscription found for this tenant');

    const now = new Date();
    let newTrialEndsAt: Date;

    if (
      subscription.status === 'trial' &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt > now
    ) {
      // Still in trial — extend from the current end date
      newTrialEndsAt = new Date(subscription.trialEndsAt);
    } else {
      // Expired, cancelled, or past_due — restart trial from now
      newTrialEndsAt = new Date();
    }
    newTrialEndsAt.setDate(newTrialEndsAt.getDate() + dto.days);

    await subscription.update({
      status: 'trial',
      trialEndsAt: newTrialEndsAt,
      cancelledAt: null,
    });

    await this.invalidateCache(dto.tenantId);
    this.logger.log(
      `Trial extended for tenant ${dto.tenantId} — new end: ${newTrialEndsAt.toISOString()}`,
    );
    return subscription.reload({ include: [Plan] });
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    await this.cacheService.del(`sub:modules:${tenantId}`);
  }
}
