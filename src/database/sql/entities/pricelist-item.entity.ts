import { BelongsTo, Column, DataType, Default, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { PricelistApplyOn, PricelistComputation } from '@/common/enums/pricelist.enums';
import { Pricelist } from './pricelist.entity';

@Table({
  tableName: 'pricelist_items',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PricelistItem extends TenantAwareEntity<PricelistItem> {
  @ForeignKey(() => Pricelist)
  @Column({ type: DataType.UUID, allowNull: false })
  pricelistId!: string;

  @Default(PricelistApplyOn.ALL)
  @Column({ type: DataType.STRING(20), allowNull: false })
  applyOn!: PricelistApplyOn;

  @Column({ type: DataType.UUID, allowNull: true })
  productId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  categoryId!: string | null;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false })
  minQty!: number;

  @Default(PricelistComputation.FIXED)
  @Column({ type: DataType.STRING(20), allowNull: false })
  computation!: PricelistComputation;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: true })
  price!: number | null;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  discountPct!: number | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  startDate!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  endDate!: string | null;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  sequence!: number;

  @BelongsTo(() => Pricelist)
  pricelist?: Pricelist;
}
