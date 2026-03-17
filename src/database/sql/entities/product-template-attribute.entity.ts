import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { Product } from './product.entity';
import { ProductAttribute } from './product-attribute.entity';

@Table({
  tableName: 'product_template_attributes',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ProductTemplateAttribute extends TenantAwareEntity<ProductTemplateAttribute> {
  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @ForeignKey(() => ProductAttribute)
  @Column({ type: DataType.UUID, allowNull: false })
  attributeId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;
}
