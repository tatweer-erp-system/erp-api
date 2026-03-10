import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'outbox_events', timestamps: true, paranoid: false, underscored: true, updatedAt: false })
export class OutboxEvent extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'event_type' })
  eventType!: string; // 'SEND_EMAIL' | 'SEND_FCM' | 'SEND_SMS'

  @Column({ type: DataType.JSONB, allowNull: false })
  payload!: Record<string, unknown>;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'pending' })
  status!: string; // 'pending' | 'processed' | 'failed'

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  attempts!: number;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'last_error' })
  lastError!: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'processed_at' })
  processedAt!: Date | null;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
}
