import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { StockMoveStatus } from '@/common/enums/inventory.enums';

@Entity({ name: 'stock_moves' })
export class StockMove extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'uuid', name: 'from_location_id' })
  fromLocationId: string;

  @Column({ type: 'uuid', name: 'to_location_id' })
  toLocationId: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  qty: number;

  @Column({ type: 'uuid', name: 'uom_id', nullable: true })
  uomId: string | null;

  @Column({ type: 'enum', enum: StockMoveStatus, default: StockMoveStatus.DRAFT })
  status: StockMoveStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 100, name: 'source_model', nullable: true })
  sourceModel: string | null;

  @Column({ type: 'uuid', name: 'source_id', nullable: true })
  sourceId: string | null;

  @Column({ type: 'timestamptz', name: 'moved_at', nullable: true })
  movedAt: Date | null;
}
