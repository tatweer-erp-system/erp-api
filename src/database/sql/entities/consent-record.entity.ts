import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'consent_records',
  timestamps: false,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class ConsentRecord extends TenantAwareEntity<ConsentRecord> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'consent_type' })
  consentType!: string; // 'marketing_email' | 'sms_notifications' | 'data_analytics' | 'third_party_sharing'

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  granted!: boolean;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'user_agent' })
  userAgent!: string | null;

  @Column({ type: DataType.DATE, allowNull: false, field: 'granted_at' })
  grantedAt!: Date;

  @Column({ type: DataType.DATE, allowNull: true, field: 'revoked_at' })
  revokedAt!: Date | null;
}
