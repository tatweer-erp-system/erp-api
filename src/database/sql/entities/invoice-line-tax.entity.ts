import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { InvoiceLine } from './invoice-line.entity';

@Table({ tableName: 'invoice_line_taxes', timestamps: true, paranoid: true, schema: 'public' })
export class InvoiceLineTax extends TenantAwareEntity<InvoiceLineTax> {
  @ForeignKey(() => InvoiceLine)
  @Column({ type: DataType.UUID, allowNull: false, onDelete: 'CASCADE' })
  invoiceLineId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  taxId!: string;
}
