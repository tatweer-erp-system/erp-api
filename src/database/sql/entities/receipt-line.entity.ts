import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('receipt_lines')
export class ReceiptLine extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'receipt_id', type: 'uuid' })
  receiptId: string;

  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({ example: '1.0000' })
  @Column({ name: 'qty_demand', type: 'decimal', precision: 15, scale: 4 })
  qtyDemand: string;

  @ApiProperty({ example: '0.0000' })
  @Column({ name: 'qty_done', type: 'decimal', precision: 15, scale: 4, default: 0 })
  qtyDone: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'uom_id', type: 'uuid', nullable: true })
  uomId: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'lot_id', type: 'uuid', nullable: true })
  lotId: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;
}
