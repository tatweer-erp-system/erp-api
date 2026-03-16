import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TicketReplySender } from '@/common/enums/ticket.enums';
import { Ticket } from './ticket.entity';

@Entity({ name: 'ticket_replies', schema: 'public' })
export class TicketReply extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.replies)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'user_name', nullable: true })
  userName: string | null;

  @Column({
    type: 'enum',
    enum: TicketReplySender,
    name: 'sender_type',
    default: TicketReplySender.AGENT,
  })
  senderType: TicketReplySender;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', name: 'is_internal', default: false })
  isInternal: boolean;
}
