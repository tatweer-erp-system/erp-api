import { Column, DataType, Table, Default, PrimaryKey, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

/** Append-only — no updates, no deletes, ever */
@Table({
  tableName: 'impersonation_logs',
  schema: 'public',
  timestamps: false,
  paranoid: false,
  underscored: true,
})
export class ImpersonationLog extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

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
