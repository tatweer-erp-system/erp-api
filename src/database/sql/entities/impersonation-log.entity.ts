import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

/** Append-only -- no updates, no deletes, ever */
@Table({
  tableName: 'impersonation_logs',
  schema: 'public',
  timestamps: false,
  paranoid: false,
  underscored: true,
})
export class ImpersonationLog extends BaseEntity<ImpersonationLog> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'admin_id' })
  adminId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'target_user_id' })
  targetUserId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  reason!: string;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: DataType.DATE, allowNull: false, field: 'started_at' })
  startedAt!: Date;

  @Column({ type: DataType.DATE, allowNull: false, field: 'token_expires_at' })
  tokenExpiresAt!: Date;
}
