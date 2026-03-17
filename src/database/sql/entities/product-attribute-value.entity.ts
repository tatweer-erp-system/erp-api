import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { ProductAttribute } from './product-attribute.entity';

@Table({
  tableName: 'product_attribute_values',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ProductAttributeValue extends TenantAwareEntity<ProductAttributeValue> {
  @ForeignKey(() => ProductAttribute)
  @Column({ type: DataType.UUID, allowNull: false })
  attributeId!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  htmlColor!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;
}
