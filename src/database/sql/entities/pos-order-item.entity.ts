import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'pos_order_items' })
export class PosOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'product_name_en', nullable: true })
  productNameEn: string | null;

  @Column({ type: 'varchar', length: 255, name: 'product_name_ar', nullable: true })
  productNameAr: string | null;

  /** Flat combined name used by legacy service code */
  @Column({ type: 'varchar', length: 255, name: 'product_name', nullable: true })
  productName: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'discount_percent', default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'discount_amount', default: 0 })
  discountAmount: number;

  @Column({ type: 'uuid', name: 'tax_id', nullable: true })
  taxId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'tax_rate', default: 0 })
  taxRate: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'tax_amount', default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true })
  subtotal: number | null;

  /** Alias used by legacy service code */
  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'line_total', nullable: true })
  lineTotal: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  modifiers: any | null;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  course: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
