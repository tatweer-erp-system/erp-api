import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'sales_orders',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class SalesOrder extends TenantAwareEntity<SalesOrder> {
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true, field: 'order_number' })
  orderNumber!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'contact_id' })
  contactId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'branch_id' })
  branchId!: string | null;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_amount',
  })
  discountAmount!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' })
  taxAmount!: number;

  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_amount',
  })
  totalAmount!: number;

  @Column({ type: DataType.STRING(10), defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.STRING(20), defaultValue: 'draft' })
  status!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  // ── ZATCA Phase 2 fields (Section 29) ──

  @Column({ type: DataType.UUID, allowNull: true, field: 'zatca_uuid' })
  zatcaUUID!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'zatca_invoice_counter' })
  zatcaInvoiceCounter!: number | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'zatca_hash' })
  zatcaHash!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'zatca_qr_code' })
  zatcaQRCode!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'zatca_signature' })
  zatcaSignature!: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'zatca_submitted_at' })
  zatcaSubmittedAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'zatca_cleared_at' })
  zatcaClearedAt!: Date | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'zatca_status' })
  zatcaStatus!: string | null; // 'pending' | 'reported' | 'cleared' | 'rejected'

  // ── Invoice classification (ZATCA) ──

  @Column({ type: DataType.STRING(20), defaultValue: 'standard', field: 'invoice_type' })
  invoiceType!: string; // 'standard' | 'simplified'

  @Column({ type: DataType.STRING(20), defaultValue: 'invoice', field: 'transaction_type' })
  transactionType!: string; // 'invoice' | 'debit_note' | 'credit_note'

  @Column({ type: DataType.STRING(20), defaultValue: 'goods', field: 'supply_type' })
  supplyType!: string; // 'goods' | 'services' | 'both'

  // ── Tax fields (ZATCA) ──

  @Column({ type: DataType.STRING(5), defaultValue: 'S', field: 'tax_category' })
  taxCategory!: string; // 'S' | 'Z' | 'E' | 'O'

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'tax_exemption_code' })
  taxExemptionCode!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'tax_exemption_reason' })
  taxExemptionReason!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'original_invoice_id' })
  originalInvoiceId!: string | null; // for credit/debit notes
}
