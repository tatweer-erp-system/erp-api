import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'security_events',
  timestamps: true,
  paranoid: false,
  updatedAt: false,
  schema: 'public',
})
export class SecurityEvent extends TenantAwareEntity<SecurityEvent> {
  @Column({ type: DataType.STRING(50), allowNull: false })
  eventType!: string; // 'login' | 'failed_login' | 'lockout' | 'new_country' | 'token_reuse'

  @Column({ type: DataType.UUID, allowNull: true })
  userId!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  tenantSlug!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  ipAddress!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  country!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  userAgent!: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  metadata!: Record<string, unknown> | null;
}
