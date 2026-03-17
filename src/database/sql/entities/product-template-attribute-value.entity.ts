import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { ProductTemplateAttribute } from './product-template-attribute.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';

@Table({
  tableName: 'product_template_attribute_values',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ProductTemplateAttributeValue extends TenantAwareEntity<ProductTemplateAttributeValue> {
  @ForeignKey(() => ProductTemplateAttribute)
  @Column({ type: DataType.UUID, allowNull: false })
  templateAttributeId!: string;

  @ForeignKey(() => ProductAttributeValue)
  @Column({ type: DataType.UUID, allowNull: false })
  attributeValueId!: string;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false, defaultValue: 0 })
  priceExtra!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
