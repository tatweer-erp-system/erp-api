import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'purchase_orders',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PurchaseOrder extends TenantAwareEntity<PurchaseOrder> {
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  orderNumber!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  vendorId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  subtotal!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  taxAmount!: number;

  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  })
  totalAmount!: number;

  @Column({ type: DataType.STRING(10), defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.STRING(20), defaultValue: 'draft' })
  status!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expectedDeliveryDate!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
