import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'retention_logs',
  timestamps: false,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class RetentionLog extends TenantAwareEntity<RetentionLog> {
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'data_type' })
  dataType!: string; // 'audit_logs' | 'notifications' | 'soft_deleted_records' | etc.

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'records_purged' })
  recordsPurged!: number;

  @Column({ type: DataType.DATE, allowNull: false, field: 'purged_at' })
  purgedAt!: Date;
}
