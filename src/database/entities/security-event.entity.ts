import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'security_events', timestamps: true, paranoid: false, underscored: true, updatedAt: false })
export class SecurityEvent extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'event_type' })
  eventType!: string; // 'login' | 'failed_login' | 'lockout' | 'new_country' | 'token_reuse'

  @Column({ type: DataType.UUID, allowNull: true, field: 'user_id' })
  userId!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true, field: 'tenant_slug' })
  tenantSlug!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  country!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'user_agent' })
  userAgent!: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  metadata!: Record<string, unknown> | null;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
}
