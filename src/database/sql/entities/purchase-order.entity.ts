import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import {
  PurchaseOrderStatus,
  PurchaseOrderBillStatus,
  PurchaseOrderReceiptStatus,
} from '@/common/enums/purchasing.enums';

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
  partnerId!: string | null;

  /** @deprecated Use partnerId instead */
  @Column({ type: DataType.UUID, allowNull: true })
  vendorId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  buyerId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  paymentTermId!: string | null;

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

  @Column({ type: DataType.STRING(20), defaultValue: PurchaseOrderStatus.DRAFT })
  status!: PurchaseOrderStatus;

  @Column({ type: DataType.STRING(20), defaultValue: PurchaseOrderBillStatus.NOTHING })
  billStatus!: PurchaseOrderBillStatus;

  @Column({ type: DataType.STRING(20), defaultValue: PurchaseOrderReceiptStatus.NOTHING })
  receiptStatus!: PurchaseOrderReceiptStatus;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expectedDeliveryDate!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 6), allowNull: false, defaultValue: 1 })
  exchangeRate!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  totalAmountBase!: number | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  discountAmount!: number;

  @Column({ type: DataType.DATE, allowNull: true })
  receivedAt!: Date | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  invoiceNumber!: string | null;
}
