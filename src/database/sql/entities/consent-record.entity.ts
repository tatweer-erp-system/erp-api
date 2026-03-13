import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'consent_records',
  timestamps: false,
  paranoid: false,
  schema: 'public',
})
export class ConsentRecord extends TenantAwareEntity<ConsentRecord> {
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  consentType!: string; // 'marketing_email' | 'sms_notifications' | 'data_analytics' | 'third_party_sharing'

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  granted!: boolean;

  @Column({ type: DataType.STRING(50), allowNull: true })
  ipAddress!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  userAgent!: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  grantedAt!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  revokedAt!: Date | null;
}
