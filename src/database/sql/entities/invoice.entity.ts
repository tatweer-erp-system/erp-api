import { Column, DataType, Default, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import {
  InvoiceTypeNew,
  InvoiceStatusNew,
  InvoicePaymentStatus,
  EtaStatus,
} from '@/common/enums/invoice.enums';

@Table({ tableName: 'invoices', timestamps: true, paranoid: true, schema: 'public' })
export class Invoice extends TenantAwareEntity<Invoice> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  journalId!: string | null;

  @Column({ type: DataType.UUID, allowNull: false })
  partnerId!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  invoiceType!: InvoiceTypeNew;

  @Default(InvoiceStatusNew.DRAFT)
  @Column({ type: DataType.STRING(20), allowNull: false })
  status!: InvoiceStatusNew;

  @Default(InvoicePaymentStatus.NOT_PAID)
  @Column({ type: DataType.STRING(20), allowNull: false })
  paymentStatus!: InvoicePaymentStatus;

  @Column({ type: DataType.STRING(50), allowNull: true })
  invoiceNumber!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  invoiceDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  dueDate!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  paymentTermId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  saleOrderId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  purchaseOrderId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  journalEntryId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Default(1)
  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false })
  exchangeRate!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amountUntaxed!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amountTax!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amountTotal!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amountResidual!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amountTotalBase!: number;

  @Column({ type: DataType.STRING(255), allowNull: true })
  reference!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  narration!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  fiscalPositionId!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  zatcaUUID!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  zatcaHash!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  zatcaQRCode!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  zatcaStatus!: EtaStatus | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  zatcaInvoiceCounter!: number | null;
}
