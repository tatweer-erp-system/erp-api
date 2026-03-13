import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { TreasuryTransactionType } from '@/common/enums/accounting.enums';

@Table({
  tableName: 'treasury_transactions',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TreasuryTransaction extends TenantAwareEntity<TreasuryTransaction> {
  @Column({ type: DataType.UUID, allowNull: false })
  accountId!: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  type!: TreasuryTransactionType;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.DECIMAL(15, 6), allowNull: true, defaultValue: 1.0 })
  exchangeRate!: number | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  reference!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  contactId!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isReconciled!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  reconciliationId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  journalEntryId!: string | null;
}
