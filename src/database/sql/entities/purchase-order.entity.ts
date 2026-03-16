import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import {
  PurchaseOrderStatus,
  PurchaseBillStatus,
  PurchaseReceiptStatus,
} from '@/common/enums/purchasing.enums';

@Entity('purchase_orders')
export class PurchaseOrder extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ example: 'PO/HQ/2025/0001', nullable: true })
  @Column({ name: 'reference', type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'currency_id', type: 'uuid', nullable: true })
  currencyId: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'buyer_id', type: 'uuid', nullable: true })
  buyerId: string | null;

  @ApiProperty({ example: '2025-01-15' })
  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @ApiProperty({ example: '2025-01-30', nullable: true })
  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'payment_term_id', type: 'uuid', nullable: true })
  paymentTermId: string | null;

  @ApiProperty({ enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  @Column({
    name: 'status',
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @ApiProperty({ enum: PurchaseBillStatus, default: PurchaseBillStatus.NOTHING })
  @Column({
    name: 'invoice_status',
    type: 'enum',
    enum: PurchaseBillStatus,
    default: PurchaseBillStatus.NOTHING,
  })
  invoiceStatus: PurchaseBillStatus;

  @ApiProperty({ enum: PurchaseReceiptStatus, default: PurchaseReceiptStatus.NOTHING })
  @Column({
    name: 'receipt_status',
    type: 'enum',
    enum: PurchaseReceiptStatus,
    default: PurchaseReceiptStatus.NOTHING,
  })
  receiptStatus: PurchaseReceiptStatus;

  @ApiProperty({ example: '0.000000' })
  @Column({ name: 'untaxed_amount', type: 'decimal', precision: 20, scale: 6, default: 0 })
  untaxedAmount: string;

  @ApiProperty({ example: '0.000000' })
  @Column({ name: 'tax_amount', type: 'decimal', precision: 20, scale: 6, default: 0 })
  taxAmount: string;

  @ApiProperty({ example: '0.000000' })
  @Column({ name: 'total_amount', type: 'decimal', precision: 20, scale: 6, default: 0 })
  totalAmount: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  // ── Additional fields ────────────────────────────────────────────────────────
  @ApiProperty({ nullable: true })
  @Column({ name: 'order_number', type: 'varchar', length: 100, nullable: true })
  orderNumber: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'exchange_rate', type: 'decimal', precision: 10, scale: 6, nullable: true })
  exchangeRate: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate: string | null;
}
