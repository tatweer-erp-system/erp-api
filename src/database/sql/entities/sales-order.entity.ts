import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import {
  SalesOrderStatus,
  SalesOrderInvoiceStatus,
  SalesOrderDeliveryStatus,
} from '@/common/enums/crm.enums';

@Table({
  tableName: 'sales_orders',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class SalesOrder extends TenantAwareEntity<SalesOrder> {
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  orderNumber!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  partnerId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  pricelistId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  paymentTermId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  salespersonId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  fiscalPositionId!: string | null;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  })
  discountAmount!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  taxAmount!: number;

  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  })
  totalAmount!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 6), allowNull: false, defaultValue: 1 })
  exchangeRate!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  totalAmountBase!: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  discountType!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  discountValue!: number | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: SalesOrderStatus.DRAFT,
  })
  status!: SalesOrderStatus;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: SalesOrderInvoiceStatus.NOTHING,
  })
  invoiceStatus!: SalesOrderInvoiceStatus;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: SalesOrderDeliveryStatus.PENDING,
  })
  deliveryStatus!: SalesOrderDeliveryStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  internalNotes!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  confirmedAt!: Date | null;
}
