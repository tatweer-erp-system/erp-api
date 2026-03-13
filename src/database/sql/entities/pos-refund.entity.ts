import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'pos_refunds',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PosRefund extends TenantAwareEntity<PosRefund> {
  @Column({ type: DataType.UUID, allowNull: false })
  originalOrderId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  refundOrderId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  refundType!: 'full' | 'partial';

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  totalRefunded!: number;

  @Column({ type: DataType.STRING(30), allowNull: true })
  refundMethod!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  reason!: string | null;

  @Column({ type: DataType.UUID, allowNull: false })
  approvedBy!: string;
}
