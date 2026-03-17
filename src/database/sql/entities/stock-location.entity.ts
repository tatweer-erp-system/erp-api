import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { LocationType } from '@/common/enums/inventory-new.enums';

@Table({
  tableName: 'stock_locations',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class StockLocation extends TenantAwareEntity<StockLocation> {
  @Column({ type: DataType.UUID, allowNull: true })
  warehouseId!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  fullName!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  parentId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: LocationType.INTERNAL })
  locationType!: LocationType;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isScrap!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isReturn!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
