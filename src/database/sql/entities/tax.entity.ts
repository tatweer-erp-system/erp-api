import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { TaxType, TaxScope } from '@/common/enums/accounting-new.enums';

@Table({
  tableName: 'taxes',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Tax extends TenantAwareEntity<Tax> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: TaxType.PERCENTAGE })
  type!: TaxType;

  @Column({ type: DataType.DECIMAL(8, 4), allowNull: false, defaultValue: 15.0 })
  amount!: number;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: TaxScope.BOTH })
  scope!: TaxScope;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  includeInPrice!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  taxGroupId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  saleAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  purchaseAccountId!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
