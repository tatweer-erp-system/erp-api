import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'vouchers',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Voucher extends TenantAwareEntity<Voucher> {
  @Column({ type: DataType.STRING(50), allowNull: false })
  code!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: false, defaultValue: 'discount' })
  type!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'percent',
  })
  discountType!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  discountValue!: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  })
  minOrderAmount!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  maxDiscountAmount!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  maxUses!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  usedCount!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  maxUsesPerCustomer!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  customerId!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  validFrom!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  validUntil!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
