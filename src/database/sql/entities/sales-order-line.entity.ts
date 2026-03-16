import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { LineInvoicingStatus } from '@/common/enums/sales-ops.enums';

@Entity({ name: 'sales_order_lines' })
export class SalesOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'sales_order_id' })
  salesOrderId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  qty: number;

  @Column({ type: 'uuid', name: 'uom_id', nullable: true })
  uomId: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'unit_price', default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'discount_percent', default: 0 })
  discountPercent: number;

  @Column({ type: 'uuid', name: 'tax_id', nullable: true })
  taxId: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'qty_delivered', default: 0 })
  qtyDelivered: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'qty_invoiced', default: 0 })
  qtyInvoiced: number;

  @Column({
    type: 'enum',
    enum: LineInvoicingStatus,
    name: 'invoicing_status',
    default: LineInvoicingStatus.NOTHING,
  })
  invoicingStatus: LineInvoicingStatus;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
