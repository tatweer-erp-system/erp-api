import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Plan } from './plan.entity';

@Table({ tableName: 'subscriptions', schema: 'public', timestamps: true, underscored: true })
export class Subscription extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @ForeignKey(() => Plan)
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'plan_id' })
  planId!: number;

  @BelongsTo(() => Plan)
  plan!: Plan;

  @Column({
    type: DataType.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
    allowNull: false,
    defaultValue: 'trial',
  })
  status!: string;

  @Column({
    type: DataType.ENUM('monthly', 'annual'),
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

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
