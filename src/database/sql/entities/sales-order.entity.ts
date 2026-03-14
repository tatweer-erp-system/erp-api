import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

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
  contactId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

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

  @Column({ type: DataType.STRING(10), defaultValue: 'SAR' })
  currency!: string;

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

  @Column({ type: DataType.STRING(20), defaultValue: 'draft' })
  status!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  // ── ZATCA Phase 2 fields (Section 29) ──

  @Column({ type: DataType.UUID, allowNull: true })
  zatcaUUID!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  zatcaInvoiceCounter!: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  zatcaHash!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  zatcaQRCode!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  zatcaSignature!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  zatcaSubmittedAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  zatcaClearedAt!: Date | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  zatcaStatus!: string | null; // 'pending' | 'reported' | 'cleared' | 'rejected'

  // ── Invoice classification (ZATCA) ──

  @Column({ type: DataType.STRING(20), defaultValue: 'standard' })
  invoiceType!: string; // 'standard' | 'simplified'

  @Column({ type: DataType.STRING(20), defaultValue: 'invoice' })
  transactionType!: string; // 'invoice' | 'debit_note' | 'credit_note'

  @Column({ type: DataType.STRING(20), defaultValue: 'goods' })
  supplyType!: string; // 'goods' | 'services' | 'both'

  // ── Tax fields (ZATCA) ──

  @Column({ type: DataType.STRING(5), defaultValue: 'S' })
  taxCategory!: string; // 'S' | 'Z' | 'E' | 'O'

  @Column({ type: DataType.STRING(50), allowNull: true })
  taxExemptionCode!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  taxExemptionReason!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  originalInvoiceId!: string | null; // for credit/debit notes
}
