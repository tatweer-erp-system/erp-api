import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'audit_logs',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class AuditLog extends BaseEntity<AuditLog> {
  @Column({ type: DataType.STRING(100), allowNull: true })
  tenantSlug!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  userId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: false })
  action!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  entity!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  entityId!: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  oldValues!: Record<string, unknown> | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  newValues!: Record<string, unknown> | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  ipAddress!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  userAgent!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  requestId!: string | null;
}
