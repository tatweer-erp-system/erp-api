import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { Invoice } from './invoice.entity';
import { PaymentNew } from './payment-new.entity';

@Table({ tableName: 'invoice_payments', timestamps: true, paranoid: true, schema: 'public' })
export class InvoicePayment extends TenantAwareEntity<InvoicePayment> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @ForeignKey(() => Invoice)
  @Column({ type: DataType.UUID, allowNull: false, onDelete: 'CASCADE' })
  invoiceId!: string;

  @ForeignKey(() => PaymentNew)
  @Column({ type: DataType.UUID, allowNull: false, onDelete: 'CASCADE' })
  paymentId!: string;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amount!: number;
}
