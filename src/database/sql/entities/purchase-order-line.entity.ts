import { Column, DataType, Table, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'purchase_order_lines',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class PurchaseOrderLine extends TenantAwareEntity<PurchaseOrderLine> {
  @Column({ type: DataType.UUID, allowNull: false })
  orderId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  productId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  productVariantId!: string | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  description!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  unitPrice!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  taxAmount!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  lineTotal!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  lineTotalBase!: number | null;

  @Column({ type: DataType.DECIMAL(15, 3), allowNull: false, defaultValue: 0 })
  receivedQuantity!: number;

  /** Alias for receivedQuantity — tracks quantity received via receipts */
  get qtyReceived(): number {
    return parseFloat(String(this.receivedQuantity ?? 0));
  }

  @Column({ type: DataType.DECIMAL(15, 3), allowNull: false, defaultValue: 0 })
  qtyBilled!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  discountAmount!: number;
}
