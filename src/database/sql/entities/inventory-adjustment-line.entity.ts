import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'inventory_adjustment_lines' })
export class InventoryAdjustmentLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'adjustment_id' })
  adjustmentId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'uuid', name: 'location_id', nullable: true })
  locationId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'on_hand_qty', default: 0 })
  onHandQty: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'counted_qty', default: 0 })
  countedQty: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'difference_qty', default: 0 })
  differenceQty: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, default: 0 })
  cost: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
