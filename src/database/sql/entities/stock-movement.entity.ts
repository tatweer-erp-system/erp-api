import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'stock_movements',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class StockMovement extends TenantAwareEntity<StockMovement> {
  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  warehouseId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  movementType!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false })
  quantityBefore!: number;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false })
  quantityAfter!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  referenceId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  referenceType!: string | null;

  @Column({ type: DataType.DECIMAL(15, 6), allowNull: false, defaultValue: 0 })
  unitCost!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  totalCost!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  lotNumber!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  serialNumber!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expiryDate!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  fromLocationId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  toLocationId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  productVariantId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  originModel!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  originId!: string | null;
}
