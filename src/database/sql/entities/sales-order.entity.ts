import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import {
  SalesOrderStatus,
  SalesInvoiceStatus,
  SalesDeliveryStatus,
  InvoiceType,
} from '@/common/enums/sales.enums';
import {
  ZatcaStatus,
  ZatcaTransactionType,
  ZatcaInvoiceType,
  ZatcaTaxCategory,
  SupplyType,
} from '@/common/enums/crm.enums';

@Entity({ name: 'sales_orders' })
export class SalesOrder extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'uuid', name: 'pricelist_id', nullable: true })
  pricelistId: string | null;

  @Column({ type: 'uuid', name: 'salesperson_id', nullable: true })
  salespersonId: string | null;

  @Column({ type: 'uuid', name: 'payment_term_id', nullable: true })
  paymentTermId: string | null;

  @Column({ type: 'enum', enum: SalesOrderStatus, default: SalesOrderStatus.DRAFT })
  status: SalesOrderStatus;

  @Column({
    type: 'enum',
    enum: SalesInvoiceStatus,
    name: 'invoice_status',
    default: SalesInvoiceStatus.NOTHING,
  })
  invoiceStatus: SalesInvoiceStatus;

  @Column({
    type: 'enum',
    enum: SalesDeliveryStatus,
    name: 'delivery_status',
    default: SalesDeliveryStatus.PENDING,
  })
  deliveryStatus: SalesDeliveryStatus;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'untaxed_amount', default: 0 })
  untaxedAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'tax_amount', default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'total_amount', default: 0 })
  totalAmount: number;

  @Column({ type: 'date', name: 'expiry_date', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  // ── Additional fields ────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 100, name: 'order_number', nullable: true })
  orderNumber: string | null;

  @Column({ type: 'uuid', name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'contact_first_name', nullable: true })
  contactFirstName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'contact_last_name', nullable: true })
  contactLastName: string | null;

  @Column({ type: 'varchar', length: 10, name: 'currency', nullable: true })
  currency: string | null;

  @Column({ type: 'uuid', name: 'currency_id', nullable: true })
  currencyId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'exchange_rate', nullable: true })
  exchangeRate: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'subtotal', nullable: true })
  subtotal: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'discount_amount', nullable: true })
  discountAmount: number | null;

  @Column({ type: 'uuid', name: 'original_invoice_id', nullable: true })
  originalInvoiceId: string | null;

  // ── ZATCA fields ─────────────────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ZatcaStatus,
    name: 'zatca_status',
    default: ZatcaStatus.NOT_REQUIRED,
  })
  zatcaStatus: ZatcaStatus;

  @Column({ type: 'varchar', length: 255, name: 'zatca_uuid', nullable: true })
  zatcaUUID: string | null;

  @Column({ type: 'text', name: 'zatca_hash', nullable: true })
  zatcaHash: string | null;

  @Column({ type: 'text', name: 'zatca_qr_code', nullable: true })
  zatcaQRCode: string | null;

  @Column({ type: 'integer', name: 'zatca_invoice_counter', nullable: true })
  zatcaInvoiceCounter: number | null;

  @Column({ type: 'enum', enum: ZatcaInvoiceType, name: 'invoice_type', nullable: true })
  invoiceType: ZatcaInvoiceType | null;

  @Column({ type: 'enum', enum: ZatcaTransactionType, name: 'transaction_type', nullable: true })
  transactionType: ZatcaTransactionType | null;

  @Column({ type: 'enum', enum: ZatcaTaxCategory, name: 'tax_category', nullable: true })
  taxCategory: ZatcaTaxCategory | null;

  @Column({ type: 'enum', enum: SupplyType, name: 'supply_type', nullable: true })
  supplyType: SupplyType | null;

  @Column({ type: 'varchar', length: 100, name: 'tax_exemption_code', nullable: true })
  taxExemptionCode: string | null;

  @Column({ type: 'text', name: 'tax_exemption_reason', nullable: true })
  taxExemptionReason: string | null;
}
