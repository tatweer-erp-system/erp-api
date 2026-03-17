import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';

@Table({
  tableName: 'product_variant_attribute_values',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ProductVariantAttributeValue extends TenantAwareEntity<ProductVariantAttributeValue> {
  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.UUID, allowNull: false })
  variantId!: string;

  @ForeignKey(() => ProductAttributeValue)
  @Column({ type: DataType.UUID, allowNull: false })
  attributeValueId!: string;
}
