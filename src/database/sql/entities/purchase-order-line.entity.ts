import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('purchase_order_lines')
export class PurchaseOrderLine extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({ example: '1.0000' })
  @Column({ name: 'qty', type: 'decimal', precision: 15, scale: 4 })
  qty: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'uom_id', type: 'uuid', nullable: true })
  uomId: string | null;

  @ApiProperty({ example: '0.000000' })
  @Column({ name: 'unit_price', type: 'decimal', precision: 20, scale: 6, default: 0 })
  unitPrice: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'tax_id', type: 'uuid', nullable: true })
  taxId: string | null;

  @ApiProperty({ example: '0.000000' })
  @Column({ name: 'subtotal', type: 'decimal', precision: 20, scale: 6, default: 0 })
  subtotal: string;

  @ApiProperty({ example: '0.0000' })
  @Column({ name: 'qty_received', type: 'decimal', precision: 15, scale: 4, default: 0 })
  qtyReceived: string;

  @ApiProperty({ example: '0.0000' })
  @Column({ name: 'qty_billed', type: 'decimal', precision: 15, scale: 4, default: 0 })
  qtyBilled: string;

  @ApiProperty({ example: 0 })
  @Column({ name: 'sequence', type: 'integer', default: 0 })
  sequence: number;
}
