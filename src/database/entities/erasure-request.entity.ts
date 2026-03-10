import {
  Column,
  DataType,
  Table,
  Default,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Model,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'erasure_requests', timestamps: true, paranoid: false, underscored: true })
export class ErasureRequest extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

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

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
