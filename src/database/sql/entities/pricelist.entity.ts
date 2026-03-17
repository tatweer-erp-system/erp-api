import { Column, DataType, Default, HasMany, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { PricelistDiscountPolicy } from '@/common/enums/pricelist.enums';
import { PricelistItem } from './pricelist-item.entity';

@Table({
  tableName: 'pricelists',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Pricelist extends TenantAwareEntity<Pricelist> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Default(PricelistDiscountPolicy.DISCOUNT_ON_SALE)
  @Column({ type: DataType.STRING(30), allowNull: false })
  discountPolicy!: PricelistDiscountPolicy;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  startDate!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  endDate!: string | null;

  @Default(true)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  isActive!: boolean;

  @HasMany(() => PricelistItem)
  items?: PricelistItem[];
}
