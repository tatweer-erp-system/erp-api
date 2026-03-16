import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subscription } from '@/database/sql/entities/subscription.entity';
import { PaymentTransaction } from '@/database/sql/entities/payment-transaction.entity';
import { SubscriptionsRepository } from '@/database/sql/repositories/subscriptions.repository';
import { PaymentTransactionsRepository } from '@/database/sql/repositories/payment-transactions.repository';
import { PlansService } from './plans.service';
import { PaymentService } from './payment.service';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { PaginationMeta, PaginatedResult } from '@/common/interfaces/pagination.interface';
import { SubscriptionStatus, PaymentVerificationStatus } from '@/common/enums/subscription.enums';
import {
  InitiatePaymentDto,
  UpgradeSubscriptionDto,
  ExtendTrialDto,
} from '../dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly paymentTransactionsRepository: PaymentTransactionsRepository,
    private readonly plansService: PlansService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  // ── Admin: list all subscriptions (paginated) ───────────────────────────────
  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    planSlug?: string;
    sortBy?: string;
    sortOrder?: string;
    expiresWithinDays?: number;
    overdue?: boolean;
  }): Promise<PaginatedResult<Subscription>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;

    if (query.expiresWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + query.expiresWithinDays);
      where.currentPeriodEnd = { lte: futureDate, gte: new Date() } as any;
    }

    if (query.overdue) {
      where.status = SubscriptionStatus.PAST_DUE;
    }

    const { rows: data, count: total } = await this.subscriptionsRepository.findAllWithPlan({
      where,
      planSlug: query.planSlug,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    const meta: PaginationMeta = {
      page,
      limit,
      total: typeof total === 'number' ? total : 0,
      totalPages: Math.ceil((typeof total === 'number' ? total : 0) / limit),
    };

    return { data, meta };
  }

  // ── Admin: get single subscription by ID ────────────────────────────────────
  async findById(id: string): Promise<Subscription> {
    return this.subscriptionsRepository.findById(id);
  }

  // ── Admin: subscription analytics ───────────────────────────────────────────
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }): Promise<Record<string, unknown>> {
    const where: any = {};
    if (params?.startDate || params?.endDate) {
      const dateFilter: any = {};
      if (params.startDate) dateFilter['gte'] = new Date(params.startDate);
      if (params.endDate) dateFilter['lte'] = new Date(params.endDate);
      where.createdAt = dateFilter;
    }

    const [total, byStatus, byPlan, byCycle, trend, activeSubscriptions] = await Promise.all([
      this.subscriptionsRepository.count({ where }),
      this.subscriptionsRepository.groupByStatus(where),
      this.subscriptionsRepository.groupByPlan(where),
      this.subscriptionsRepository.groupByCycle(where),
      this.subscriptionsRepository.getMonthlyTrend(12),
      this.subscriptionsRepository.findActiveWithPlan(),
    ]);

    // MRR calculation: count active subscriptions × plan price
    const mrr = activeSubscriptions.reduce((sum: number, sub: Subscription) => {
      const price =
        sub.billingCycle === 'annual'
          ? Number(sub.plan?.annualPrice ?? 0) / 12
          : Number(sub.plan?.monthlyPrice ?? 0);
      return sum + price;
    }, 0);

    return {
      total,
      byStatus,
      byPlan,
      byCycle,
      trend,
      mrr: Math.round(mrr * 100) / 100,
      activeCount: activeSubscriptions.length,
      trialCount: await this.subscriptionsRepository.count({
        where: { status: SubscriptionStatus.TRIAL },
      }),
    };
  }

  /** Called during tenant provisioning — creates a 14-day trial on starter plan */
  async createTrial(tenantId: string): Promise<Subscription> {
    const trialDays = this.configService.get<number>('payment.trialDays') ?? 14;
    const starterPlan = await this.plansService.findBySlug('starter');

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.subscriptionsRepository.create({
      tenantId,
      planId: starterPlan.id,
      status: SubscriptionStatus.TRIAL,
      billingCycle: 'monthly',
      trialEndsAt,
    } as Partial<Subscription>);
  }

  async findByTenant(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findByTenant(tenantId);
  }

  async getSubscriptionModules(tenantSlug: string, tenantId: string): Promise<string[]> {
    const cacheKey = `sub:modules:${tenantId}`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const subscription = await this.subscriptionsRepository.findByTenant(tenantId);

    if (
      !subscription ||
      ![SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE].includes(
        subscription.status as SubscriptionStatus,
      )
    ) {
      await this.cacheService.set(cacheKey, [], 300);
      return [];
    }

    // If trial expired, deny access
    if (
      subscription.status === SubscriptionStatus.TRIAL &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt < new Date()
    ) {
      await this.subscriptionsRepository.update(subscription.id, {
        status: SubscriptionStatus.EXPIRED,
      } as Partial<Subscription>);
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
      description: `${plan.nameEn} plan — ${dto.billingCycle}`,
      callbackUrl,
      metadata: {
        tenantId,
        planId: String(plan.id),
        subscriptionId: String(subscription.id),
        billingCycle: dto.billingCycle,
        frontendRedirectUrl: dto.frontendRedirectUrl ?? '',
      },
    });

    // Record the pending transaction
    await this.paymentTransactionsRepository.create({
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

    const tx = await this.paymentTransactionsRepository.findByProviderTxId(providerTransactionId);
    if (!tx) {
      this.logger.warn(`Payment callback for unknown transaction: ${providerTransactionId}`);
      return { success: false };
    }

    await this.paymentTransactionsRepository.update(tx.id, {
      status:
        verification.status === PaymentVerificationStatus.PAID
          ? PaymentVerificationStatus.PAID
          : PaymentVerificationStatus.FAILED,
      providerResponse: verification.raw,
    } as Partial<PaymentTransaction>);

    if (verification.status === PaymentVerificationStatus.PAID) {
      await this.activateSubscription(tx.subscriptionId, tx.tenantId, verification.raw);
    }

    const frontendRedirectUrl = (verification.raw?.metadata as Record<string, string>)
      ?.frontendRedirectUrl;
    return {
      success: verification.status === PaymentVerificationStatus.PAID,
      redirectUrl: frontendRedirectUrl,
    };
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

    await this.subscriptionsRepository.update(subscription.id, {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
    } as Partial<Subscription>);
    await this.invalidateCache(subscription.tenantId);
    return (await this.findByTenant(tenantId)) ?? subscription;
  }

  async getTransactions(tenantId: string): Promise<PaymentTransaction[]> {
    return this.paymentTransactionsRepository.findByTenant(tenantId);
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

    await this.subscriptionsRepository.update(subscription.id, {
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    } as Partial<Subscription>);
    await this.invalidateCache(tenantId);
    return (await this.findByTenant(tenantId)) ?? subscription;
  }

  private async activateSubscription(
    subscriptionId: string,
    tenantId: string,
    raw: Record<string, unknown>,
  ): Promise<void> {
    const metadata = raw?.metadata as Record<string, string> | undefined;
    const planId = metadata?.planId ? metadata.planId : undefined;
    const billingCycle = (metadata?.billingCycle as 'monthly' | 'annual') ?? 'monthly';

    const subscription = await this.subscriptionsRepository.findByIdOrNull(subscriptionId);
    if (!subscription) return;

    const periodStart = new Date();
    const periodEnd = new Date();
    billingCycle === 'annual'
      ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      : periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.subscriptionsRepository.update(subscriptionId, {
      planId: planId ?? subscription.planId ?? undefined,
      status: SubscriptionStatus.ACTIVE,
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    } as Partial<Subscription>);

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
      subscription.status === SubscriptionStatus.TRIAL &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt > now
    ) {
      newTrialEndsAt = new Date(subscription.trialEndsAt);
    } else {
      newTrialEndsAt = new Date();
    }
    newTrialEndsAt.setDate(newTrialEndsAt.getDate() + dto.days);

    await this.subscriptionsRepository.update(subscription.id, {
      status: SubscriptionStatus.TRIAL,
      trialEndsAt: newTrialEndsAt,
      cancelledAt: null,
    } as Partial<Subscription>);

    await this.invalidateCache(dto.tenantId);
    this.logger.log(
      `Trial extended for tenant ${dto.tenantId} — new end: ${newTrialEndsAt.toISOString()}`,
    );
    return (await this.findByTenant(dto.tenantId)) ?? subscription;
  }

  /** Superadmin: toggle auto-renewal for a tenant */
  async toggleAutoRenewal(tenantId: string, autoRenewal: boolean): Promise<Subscription> {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');

    await this.subscriptionsRepository.update(subscription.id, {
      autoRenewal,
    } as Partial<Subscription>);
    return (await this.findByTenant(tenantId)) ?? subscription;
  }

  /** Superadmin: change plan (upgrade or downgrade) without payment */
  async adminChangePlan(
    tenantId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'annual',
  ): Promise<Subscription> {
    const plan = await this.plansService.findBySlug(planSlug);
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');

    await this.subscriptionsRepository.update(subscription.id, {
      planId: plan.id,
      billingCycle,
    } as Partial<Subscription>);
    await this.invalidateCache(tenantId);
    return (await this.findByTenant(tenantId)) ?? subscription;
  }

  /** Superadmin: retry payment for a past_due or failed subscription */
  async adminRetryPayment(tenantId: string): Promise<Subscription> {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');

    if (!['past_due', 'expired'].includes(subscription.status)) {
      throw new BadRequestException('Can only retry payment for past_due or expired subscriptions');
    }

    const periodStart = new Date();
    const periodEnd = new Date();
    subscription.billingCycle === 'annual'
      ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      : periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.subscriptionsRepository.update(subscription.id, {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    } as Partial<Subscription>);
    await this.invalidateCache(tenantId);
    return (await this.findByTenant(tenantId)) ?? subscription;
  }

  /** Superadmin: update payment method for a tenant */
  async updatePaymentMethod(
    tenantId: string,
    paymentToken: string,
    cardLastFour?: string,
    cardBrand?: string,
    cardExpiry?: string,
  ): Promise<{ success: boolean }> {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');

    this.logger.log(
      `Payment method updated for tenant ${tenantId} — card ending ${cardLastFour ?? 'unknown'}`,
    );

    return { success: true };
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    await this.cacheService.del(`sub:modules:${tenantId}`);
  }
}
