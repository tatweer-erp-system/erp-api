import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TicketStatus, TicketPriority } from '@/common/enums/ticket.enums';
import { TicketReply } from './ticket-reply.entity';

@Entity({ name: 'tickets', schema: 'public' })
export class Ticket extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'tenant_name', nullable: true })
  tenantName: string | null;

  @Column({ type: 'uuid', name: 'raised_by', nullable: true })
  raisedBy: string | null;

  @Column({ type: 'varchar', length: 255, name: 'created_by_name', nullable: true })
  createdByName: string | null;

  @Column({ type: 'varchar', length: 500, name: 'subject' })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Column({ type: 'uuid', name: 'assigned_to', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'varchar', length: 255, name: 'assigned_to_name', nullable: true })
  assignedToName: string | null;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'closed_at', nullable: true })
  closedAt: Date | null;

  @OneToMany(() => TicketReply, (reply) => reply.ticket)
  replies: TicketReply[];
}
