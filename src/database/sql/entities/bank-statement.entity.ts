import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { BankStatementStatus } from '@/common/enums/bank-statement.enums';

@Table({
  tableName: 'bank_statements',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class BankStatement extends TenantAwareEntity<BankStatement> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  journalId!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  dateFrom!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  dateTo!: string;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  balanceStart!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  balanceEnd!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: true })
  balanceEndReal!: number | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: BankStatementStatus.OPEN,
  })
  status!: BankStatementStatus;
}
