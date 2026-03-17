import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'sales_order_lines',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class SalesOrderLine extends TenantAwareEntity<SalesOrderLine> {
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

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 0 })
  discountPct!: number;

  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  })
  discountAmount!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 15 })
  taxRate!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  taxAmount!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  lineTotal!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  lineTotalBase!: number | null;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, defaultValue: 0 })
  qtyDelivered!: number;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, defaultValue: 0 })
  qtyInvoiced!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isComboParent!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  comboParentLineId!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;
}
