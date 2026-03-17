import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'receipt_lines',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ReceiptLine extends TenantAwareEntity<ReceiptLine> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  receiptId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  purchaseOrderLineId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  stockMoveId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  productVariantId!: string | null;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false })
  qtyDemand!: number;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false, defaultValue: 0 })
  qtyDone!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  unitOfMeasureId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  locationId!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  lotNumber!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  serialNumber!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expiryDate!: string | null;

  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false, defaultValue: 0 })
  unitCost!: number;
}
