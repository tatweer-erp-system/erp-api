import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
} from 'sequelize-typescript';
import { Subscription } from './subscription.entity';

export type TransactionStatus = 'pending' | 'paid' | 'failed' | 'refunded';

@Table({ tableName: 'payment_transactions', schema: 'public', timestamps: true, underscored: true })
export class PaymentTransaction extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string;

  @ForeignKey(() => Subscription)
  @Column({ type: DataType.UUID, allowNull: false, field: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'SAR' })
  currency: string;

  @Column({
    type: DataType.ENUM('pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: TransactionStatus;

  @Column({ type: DataType.STRING(50), allowNull: false })
  provider: string;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'provider_transaction_id' })
  providerTransactionId: string | null;

  @Column({ type: DataType.JSONB, allowNull: true, field: 'provider_response' })
  providerResponse: Record<string, unknown> | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
