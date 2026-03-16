import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'delivery_lines' })
export class DeliveryLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'delivery_id' })
  deliveryId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'qty_demand' })
  qtyDemand: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'qty_done', default: 0 })
  qtyDone: number;

  @Column({ type: 'uuid', name: 'uom_id', nullable: true })
  uomId: string | null;

  @Column({ type: 'uuid', name: 'lot_id', nullable: true })
  lotId: string | null;

  @Column({ type: 'uuid', name: 'location_id', nullable: true })
  locationId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
