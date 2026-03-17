import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { Product } from './product.entity';

@Table({
  tableName: 'combo_products',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ComboProduct extends TenantAwareEntity<ComboProduct> {
  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  productId!: string;
}
