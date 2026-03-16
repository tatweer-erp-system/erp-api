import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'transfer_lines' })
export class TransferLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'transfer_id' })
  transferId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'qty_requested' })
  qtyRequested: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'qty_done', default: 0 })
  qtyDone: number;

  @Column({ type: 'uuid', name: 'uom_id', nullable: true })
  uomId: string | null;

  @Column({ type: 'uuid', name: 'lot_id', nullable: true })
  lotId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
