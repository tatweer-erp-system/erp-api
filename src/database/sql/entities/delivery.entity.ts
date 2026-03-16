import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { DeliveryStatus } from '@/common/enums/sales.enums';

@Entity({ name: 'deliveries' })
export class Delivery extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', name: 'sales_order_id', nullable: true })
  salesOrderId: string | null;

  @Column({ type: 'uuid', name: 'partner_id', nullable: true })
  partnerId: string | null;

  @Column({ type: 'date', name: 'scheduled_date', nullable: true })
  scheduledDate: Date | null;

  @Column({ type: 'date', name: 'done_date', nullable: true })
  doneDate: Date | null;

  @Column({ type: 'uuid', name: 'responsible_id', nullable: true })
  responsibleId: string | null;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.READY })
  status: DeliveryStatus;
}
