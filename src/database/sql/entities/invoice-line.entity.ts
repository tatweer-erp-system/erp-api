import { Column, DataType, Default, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { Invoice } from './invoice.entity';

@Table({ tableName: 'invoice_lines', timestamps: true, paranoid: true, schema: 'public' })
export class InvoiceLine extends TenantAwareEntity<InvoiceLine> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @ForeignKey(() => Invoice)
  @Column({ type: DataType.UUID, allowNull: false, onDelete: 'CASCADE' })
  invoiceId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  productId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  productVariantId!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: false })
  description!: string;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false })
  unitPrice!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false })
  discountPct!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  priceSubtotal!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  priceTax!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  priceTotal!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  accountId!: string | null;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  sequence!: number;
}
