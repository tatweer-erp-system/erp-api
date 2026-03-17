import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { Product } from './product.entity';

@Table({
  tableName: 'product_taxes',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ProductTax extends TenantAwareEntity<ProductTax> {
  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  taxId!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'sale' })
  scope!: string;
}
