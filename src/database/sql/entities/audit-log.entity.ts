import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'audit_logs',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class AuditLog extends BaseEntity<AuditLog> {
  @Column({ type: DataType.STRING(100), allowNull: true, field: 'tenant_slug' })
  tenantSlug!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'user_id' })
  userId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: false })
  action!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  entity!: string;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'entity_id' })
  entityId!: string | null;

  @Column({ type: DataType.JSONB, allowNull: true, field: 'old_values' })
  oldValues!: Record<string, unknown> | null;

  @Column({ type: DataType.JSONB, allowNull: true, field: 'new_values' })
  newValues!: Record<string, unknown> | null;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'user_agent' })
  userAgent!: string | null;
}
