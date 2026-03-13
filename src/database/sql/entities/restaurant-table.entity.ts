import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { TableStatus } from '@/common/enums/pos.enums';

@Table({
  tableName: 'restaurant_tables',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class RestaurantTable extends TenantAwareEntity<RestaurantTable> {
  @Column({ type: DataType.UUID, allowNull: false })
  sectionId!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  number!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 4 })
  capacity!: number;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 1 })
  minCapacity!: number | null;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: TableStatus.AVAILABLE })
  status!: TableStatus;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  posX!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  posY!: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true, defaultValue: 'square' })
  shape!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 80 })
  width!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 80 })
  height!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
