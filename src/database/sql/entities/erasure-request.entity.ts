import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'erasure_requests',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class ErasureRequest extends TenantAwareEntity<ErasureRequest> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId!: string;

  @Column({ type: DataType.DATE, allowNull: false, field: 'requested_at' })
  requestedAt!: Date;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'pending' })
  status!: string; // 'pending' | 'processing' | 'completed' | 'rejected'

  @Column({ type: DataType.TEXT, allowNull: true })
  reason!: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'processed_at' })
  processedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'processed_by' })
  processedBy!: string | null;
}
