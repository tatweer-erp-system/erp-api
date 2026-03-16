import { Entity, Column, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'stock_quants' })
@Index(['branchId', 'productId', 'locationId', 'lotId'], { unique: true })
export class StockQuant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @Column({ type: 'uuid', name: 'lot_id', nullable: true })
  lotId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  qty: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'reserved_qty', default: 0 })
  reservedQty: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'avg_cost', default: 0 })
  avgCost: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
