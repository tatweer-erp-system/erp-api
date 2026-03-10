import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'tenant_metrics', schema: 'public', timestamps: true, paranoid: false, underscored: true, updatedAt: false })
export class TenantMetric extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'metric_date' })
  metricDate!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'active_users' })
  activeUsers!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'api_calls_total' })
  apiCallsTotal!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'storage_used_mb' })
  storageUsedMb!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'records_total' })
  recordsTotal!: number;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
}
