import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'pos_sessions',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PosSession extends TenantAwareEntity<PosSession> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  cashierId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  terminalId!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'open' })
  status!: string;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  })
  openingFloat!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  closingFloat!: number | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  expectedFloat!: number | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  floatDifference!: number | null;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  openedAt!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  closedAt!: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
