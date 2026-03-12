import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'products',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Product extends TenantAwareEntity<Product> {
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  sku!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  barcode!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'category_id' })
  categoryId!: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'unit_price' })
  unitPrice!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, field: 'cost_price' })
  costPrice!: number | null;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'pcs',
    field: 'unit_of_measure',
  })
  unitOfMeasure!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'reorder_point' })
  reorderPoint!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 15, field: 'tax_rate' })
  taxRate!: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.JSONB, allowNull: true })
  images!: string[] | null;
}
