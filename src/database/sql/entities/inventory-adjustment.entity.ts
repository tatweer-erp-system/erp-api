import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { AdjustmentStatus } from '@/common/enums/inventory.enums';

@Entity({ name: 'inventory_adjustments' })
export class InventoryAdjustment extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: AdjustmentStatus, default: AdjustmentStatus.DRAFT })
  status: AdjustmentStatus;

  @Column({ type: 'uuid', name: 'responsible_id', nullable: true })
  responsibleId: string | null;

  @Column({ type: 'uuid', name: 'validated_by_id', nullable: true })
  validatedById: string | null;

  @Column({ type: 'timestamptz', name: 'validated_at', nullable: true })
  validatedAt: Date | null;
}
