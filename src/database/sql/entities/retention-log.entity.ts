import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'retention_logs',
  timestamps: false,
  paranoid: false,
  schema: 'public',
})
export class RetentionLog extends TenantAwareEntity<RetentionLog> {
  @Column({ type: DataType.STRING(100), allowNull: false })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  dataType!: string; // 'audit_logs' | 'notifications' | 'soft_deleted_records' | etc.

  @Column({ type: DataType.INTEGER, allowNull: false })
  recordsPurged!: number;

  @Column({ type: DataType.DATE, allowNull: false })
  purgedAt!: Date;
}
