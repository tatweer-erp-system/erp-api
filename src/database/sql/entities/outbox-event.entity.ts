import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'outbox_events',
  timestamps: true,
  paranoid: false,
  underscored: true,
  updatedAt: false,
  schema: 'public',
})
export class OutboxEvent extends TenantAwareEntity<OutboxEvent> {
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'event_type' })
  eventType!: string; // 'SEND_EMAIL' | 'SEND_FCM' | 'SEND_SMS' | 'sales_order.confirmed' | etc.

  @Column({ type: DataType.JSONB, allowNull: false })
  payload!: Record<string, unknown>;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'pending' })
  status!: string; // 'pending' | 'processed' | 'failed' | 'dead'

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  attempts!: number;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'last_error' })
  lastError!: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'processed_at' })
  processedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'reference_id' })
  referenceId!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true, field: 'reference_type' })
  referenceType!: string | null;
}
