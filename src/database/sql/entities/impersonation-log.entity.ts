import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

/** Append-only -- no updates, no deletes, ever */
@Table({
  tableName: 'impersonation_logs',
  schema: 'public',
  timestamps: false,
  paranoid: false,
})
export class ImpersonationLog extends BaseEntity<ImpersonationLog> {
  @Column({ type: DataType.UUID, allowNull: false })
  adminId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  targetUserId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  tenantSlug!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  reason!: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  ipAddress!: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  startedAt!: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  tokenExpiresAt!: Date;
}
