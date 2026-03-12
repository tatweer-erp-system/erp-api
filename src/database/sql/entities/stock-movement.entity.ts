import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'stock_movements',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class StockMovement extends TenantAwareEntity<StockMovement> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'product_id' })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'warehouse_id' })
  warehouseId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'movement_type' })
  movementType!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, field: 'quantity_before' })
  quantityBefore!: number;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, field: 'quantity_after' })
  quantityAfter!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'reference_id' })
  referenceId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'reference_type' })
  referenceType!: string | null;
}
