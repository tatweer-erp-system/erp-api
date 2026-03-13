import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'erasure_requests',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class ErasureRequest extends TenantAwareEntity<ErasureRequest> {
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.DATE, allowNull: false })
  requestedAt!: Date;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'pending' })
  status!: string; // 'pending' | 'processing' | 'completed' | 'rejected'

  @Column({ type: DataType.TEXT, allowNull: true })
  reason!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  processedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  processedBy!: string | null;
}
