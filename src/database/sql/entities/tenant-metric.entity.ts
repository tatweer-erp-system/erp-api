import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'tenant_metrics',
  schema: 'public',
  timestamps: true,
  paranoid: false,
  underscored: true,
  updatedAt: false,
})
export class TenantMetric extends BaseEntity<TenantMetric> {
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'metric_date' })
  metricDate!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'active_users' })
  activeUsers!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'api_calls_total' })
  apiCallsTotal!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'storage_used_mb',
  })
  storageUsedMb!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'records_total' })
  recordsTotal!: number;
}
