import { Table, Column, DataType, ForeignKey } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';
import { Subscription } from './subscription.entity';

@Table({
  tableName: 'payment_transactions',
  schema: 'public',
  timestamps: true,
  paranoid: false,
})
export class PaymentTransaction extends BaseEntity<PaymentTransaction> {
  @ForeignKey(() => Subscription)
  @Column({ type: DataType.UUID, allowNull: false })
  subscriptionId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  })
  status!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  provider!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  providerTransactionId!: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  providerResponse!: Record<string, unknown> | null;
}
