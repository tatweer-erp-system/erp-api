import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';
import { Plan } from './plan.entity';
import { Tenant } from './tenant.entity';

@Table({
  tableName: 'subscriptions',
  schema: 'public',
  timestamps: true,
  underscored: true,
  paranoid: false,
})
export class Subscription extends BaseEntity<Subscription> {
  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @BelongsTo(() => Tenant)
  tenant!: Tenant;

  @ForeignKey(() => Plan)
  @Column({ type: DataType.INTEGER, allowNull: true, field: 'plan_id' })
  planId!: number;

  @BelongsTo(() => Plan)
  plan!: Plan;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'trial',
  })
  status!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'monthly',
    field: 'billing_cycle',
  })
  billingCycle!: string;

  @Column({ type: DataType.DATE, allowNull: true, field: 'trial_ends_at' })
  trialEndsAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'current_period_start' })
  currentPeriodStart!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'current_period_end' })
  currentPeriodEnd!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'cancelled_at' })
  cancelledAt!: Date | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'auto_renewal' })
  autoRenewal!: boolean;
}
