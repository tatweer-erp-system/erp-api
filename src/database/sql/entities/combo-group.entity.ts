import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { ComboProduct } from './combo-product.entity';

@Table({
  tableName: 'combo_groups',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ComboGroup extends TenantAwareEntity<ComboGroup> {
  @ForeignKey(() => ComboProduct)
  @Column({ type: DataType.UUID, allowNull: false })
  comboId!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isRequired!: boolean;
}
