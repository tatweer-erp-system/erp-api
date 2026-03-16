import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { KitchenTicketStatus, CourseType } from '@/common/enums/restaurant.enums';

export interface KitchenItem {
  productId: string;
  name: { en: string; ar: string };
  quantity: number;
  notes?: string;
}

@Entity({ name: 'kitchen_tickets' })
export class KitchenTicket extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'table_id', nullable: true })
  tableId: string | null;

  @Column({ type: 'enum', enum: CourseType, name: 'course_type', nullable: true })
  courseType: CourseType | null;

  @Column({ type: 'enum', enum: KitchenTicketStatus, default: KitchenTicketStatus.PENDING })
  status: KitchenTicketStatus;

  @Column({ type: 'jsonb', name: 'items' })
  items: KitchenItem[];

  @Column({ type: 'timestamptz', name: 'fired_at' })
  firedAt: Date;

  @Column({ type: 'timestamptz', name: 'ready_at', nullable: true })
  readyAt: Date | null;

  @Column({ type: 'timestamptz', name: 'served_at', nullable: true })
  servedAt: Date | null;

  @Column({ type: 'int', name: 'ticket_number' })
  ticketNumber: number;
}
