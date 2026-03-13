import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'cash_movements',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class CashMovement extends TenantAwareEntity<CashMovement> {
  @Column({ type: DataType.UUID, allowNull: false })
  sessionId!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: 'cash_in' | 'cash_out';

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  reason!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.UUID, allowNull: false })
  cashierId!: string;
}
