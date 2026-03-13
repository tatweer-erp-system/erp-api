import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'outbox_events',
  timestamps: true,
  paranoid: false,
  updatedAt: false,
  schema: 'public',
})
export class OutboxEvent extends TenantAwareEntity<OutboxEvent> {
  @Column({ type: DataType.STRING(100), allowNull: false })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  eventType!: string; // 'SEND_EMAIL' | 'SEND_FCM' | 'SEND_SMS' | 'sales_order.confirmed' | etc.

  @Column({ type: DataType.JSONB, allowNull: false })
  payload!: Record<string, unknown>;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'pending' })
  status!: string; // 'pending' | 'processed' | 'failed' | 'dead'

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  attempts!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  lastError!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  processedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  referenceId!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  referenceType!: string | null;
}
