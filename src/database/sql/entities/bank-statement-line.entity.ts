import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { BankStatement } from './bank-statement.entity';

@Table({
  tableName: 'bank_statement_lines',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class BankStatementLine extends TenantAwareEntity<BankStatementLine> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @ForeignKey(() => BankStatement)
  @Column({ type: DataType.UUID, allowNull: false })
  statementId!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  reference!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  partnerName!: string | null;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isReconciled!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  journalEntryId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  paymentId!: string | null;
}
