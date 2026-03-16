import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { PosOrderStatus, OrderType } from '@/common/enums/pos.enums';

@Entity({ name: 'pos_orders' })
export class PosOrder extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  /** Used by legacy service code as orderNumber */
  @Column({ type: 'varchar', length: 100, name: 'order_number', nullable: true })
  orderNumber: string | null;

  @Column({ type: 'uuid', name: 'cashier_id', nullable: true })
  cashierId: string | null;

  @Column({ type: 'uuid', name: 'customer_id', nullable: true })
  customerId: string | null;

  @Column({ type: 'uuid', name: 'pricelist_id', nullable: true })
  pricelistId: string | null;

  @Column({ type: 'enum', enum: PosOrderStatus, default: PosOrderStatus.DRAFT })
  status: PosOrderStatus;

  @Column({ type: 'enum', enum: OrderType, name: 'order_type', default: OrderType.TAKEAWAY })
  orderType: OrderType;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'subtotal', default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'discount_amount', default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'tax_amount', default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'tip_amount', default: 0 })
  tipAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'delivery_fee', default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'total', nullable: true })
  total: number | null;

  /** Alias used by legacy service code */
  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'total_amount', nullable: true })
  totalAmount: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'amount_paid', default: 0 })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'change_amount', default: 0 })
  changeAmount: number;

  @Column({ type: 'uuid', name: 'table_id', nullable: true })
  tableId: string | null;

  @Column({ type: 'int', name: 'covers', nullable: true })
  covers: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'uuid', name: 'accounting_invoice_id', nullable: true })
  accountingInvoiceId: string | null;

  @Column({ type: 'text', name: 'delivery_address', nullable: true })
  deliveryAddress: string | null;

  @Column({ type: 'uuid', name: 'currency_id', nullable: true })
  currencyId: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'exchange_rate', nullable: true })
  exchangeRate: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'total_amount_base', nullable: true })
  totalAmountBase: number | null;

  /** Idempotency key for offline sync */
  @Column({ type: 'varchar', length: 255, name: 'offline_id', nullable: true, unique: true })
  offlineId: string | null;

  @Column({ type: 'timestamptz', name: 'synced_at', nullable: true })
  syncedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'created_offline_at', nullable: true })
  createdOfflineAt: Date | null;
}
