import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';
import { Plan } from './plan.entity';
import { Tenant } from './tenant.entity';

@Table({
  tableName: 'subscriptions',
  schema: 'public',
  timestamps: true,
  paranoid: true,
})
export class Subscription extends BaseEntity<Subscription> {
  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @BelongsTo(() => Tenant)
  tenant!: Tenant;

  @ForeignKey(() => Plan)
  @Column({ type: DataType.INTEGER, allowNull: true })
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
  })
  billingCycle!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  trialEndsAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  currentPeriodStart!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  currentPeriodEnd!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  cancelledAt!: Date | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  autoRenewal!: boolean;
}
