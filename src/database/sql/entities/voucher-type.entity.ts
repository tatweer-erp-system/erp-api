import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { VoucherDiscountType } from '@/common/enums/definitions.enums';

@Table({
  tableName: 'voucher_types',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class VoucherTypeConfig extends TenantAwareEntity<VoucherTypeConfig> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: VoucherDiscountType.PERCENTAGE,
  })
  discountType!: VoucherDiscountType;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  discountValue!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  minOrderAmount!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  validDays!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  maxUses!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
