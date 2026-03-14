import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { TreasuryAccountType } from '@/common/enums/accounting.enums';

@Table({
  tableName: 'treasury_accounts',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TreasuryAccount extends TenantAwareEntity<TreasuryAccount> {
  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: TreasuryAccountType;

  @Column({ type: DataType.STRING(100), allowNull: true })
  bankName!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  accountNumber!: string | null;

  @Column({ type: DataType.STRING(34), allowNull: true })
  iban!: string | null;

  @Column({ type: DataType.STRING(11), allowNull: true })
  swiftCode!: string | null;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  currentBalance!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  coaAccountId!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isDefault!: boolean;
}
