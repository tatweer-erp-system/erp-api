import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { AccountType, NormalBalance } from '@/common/enums/accounting.enums';

@Table({
  tableName: 'chart_of_accounts',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ChartOfAccount extends TenantAwareEntity<ChartOfAccount> {
  @Column({ type: DataType.STRING(20), allowNull: false })
  code!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: AccountType;

  @Column({ type: DataType.STRING(50), allowNull: true })
  subType!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  parentId!: string | null;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: NormalBalance.DEBIT })
  normalBalance!: NormalBalance;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  allowDirectPosting!: boolean;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
  openingBalance!: number | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  openingBalanceDate!: string | null;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;
}
