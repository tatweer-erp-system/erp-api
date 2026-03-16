import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { SubscriptionStatus, BillingCycle } from '@/common/enums/subscription.enums';
import { Plan } from './plan.entity';

@Entity({ name: 'subscriptions' })
export class Subscription extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'plan_id', nullable: true })
  planId: string | null;

  @ManyToOne(() => Plan, { nullable: true, eager: false })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan | null;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'billing_cycle',
    default: BillingCycle.MONTHLY,
  })
  billingCycle: string;

  @Column({ type: 'date', name: 'trial_ends_at', nullable: true })
  trialEndsAt: Date | null;

  @Column({ type: 'timestamptz', name: 'current_period_start', nullable: true })
  currentPeriodStart: Date | null;

  @Column({ type: 'timestamptz', name: 'current_period_end', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ type: 'boolean', name: 'auto_renewal', default: true })
  autoRenewal: boolean;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', name: 'cancel_reason', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'varchar', length: 100, name: 'external_ref', nullable: true })
  externalRef: string | null;
}
