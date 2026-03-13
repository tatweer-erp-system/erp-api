import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'tenant_metrics',
  schema: 'public',
  timestamps: true,
  paranoid: false,
  updatedAt: false,
})
export class TenantMetric extends BaseEntity<TenantMetric> {
  @Column({ type: DataType.STRING(100), allowNull: false })
  tenantSlug!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  metricDate!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  activeUsers!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  apiCallsTotal!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  })
  storageUsedMb!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  recordsTotal!: number;
}
