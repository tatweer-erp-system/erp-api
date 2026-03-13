import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'restaurant_sections',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class RestaurantSection extends TenantAwareEntity<RestaurantSection> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.STRING(20), allowNull: true, defaultValue: '#1D9E75' })
  color!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 1 })
  floorNumber!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  sortOrder!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
