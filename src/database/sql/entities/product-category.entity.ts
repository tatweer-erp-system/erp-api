import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'product_categories',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class ProductCategory extends TenantAwareEntity<ProductCategory> {
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'parent_id' })
  parentId!: string | null;
}
