import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { Product } from './product.entity';

@Table({
  tableName: 'product_variants',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ProductVariant extends TenantAwareEntity<ProductVariant> {
  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  combinationName!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  barcode!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  internalRef!: string | null;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false, defaultValue: 0 })
  priceExtra!: number;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: true })
  costPrice!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
