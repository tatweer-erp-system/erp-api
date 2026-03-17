import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { ComboGroup } from './combo-group.entity';
import { Product } from './product.entity';

@Table({
  tableName: 'combo_group_items',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ComboGroupItem extends TenantAwareEntity<ComboGroupItem> {
  @ForeignKey(() => ComboGroup)
  @Column({ type: DataType.UUID, allowNull: false })
  groupId!: string;

  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false, defaultValue: 0 })
  extraPrice!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;
}
