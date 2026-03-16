import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TransferStatus } from '@/common/enums/inventory.enums';

@Entity({ name: 'transfers' })
export class Transfer extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', name: 'from_branch_id', nullable: true })
  fromBranchId: string | null;

  @Column({ type: 'uuid', name: 'from_location_id' })
  fromLocationId: string;

  @Column({ type: 'uuid', name: 'to_branch_id', nullable: true })
  toBranchId: string | null;

  @Column({ type: 'uuid', name: 'to_location_id' })
  toLocationId: string;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: Date;

  @Column({ type: 'date', name: 'done_date', nullable: true })
  doneDate: Date | null;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.DRAFT })
  status: TransferStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
