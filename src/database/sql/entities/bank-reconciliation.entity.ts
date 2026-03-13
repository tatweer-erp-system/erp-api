import { Column, DataType, Table } from 'sequelize-typescript';
import { Model } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';
import { ReconciliationStatus } from '@/common/enums/accounting.enums';

@Table({
  tableName: 'bank_reconciliations',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class BankReconciliation extends Model<BankReconciliation> {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  accountId!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  statementDate!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  openingBalance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  closingBalance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  systemBalance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  difference!: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: ReconciliationStatus.IN_PROGRESS,
  })
  status!: ReconciliationStatus;

  @Column({ type: DataType.UUID, allowNull: true })
  reconciledBy!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  completedAt!: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  version!: number;
}
