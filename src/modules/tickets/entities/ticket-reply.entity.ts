import { Column, DataType, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TenantAwareEntity } from '@/database/sql/base.entity';
import { Ticket } from './ticket.entity';

@Table({
  tableName: 'ticket_replies',
  timestamps: true,
  schema: 'public',
})
export class TicketReply extends TenantAwareEntity<TicketReply> {
  @ForeignKey(() => Ticket)
  @Column({ type: DataType.UUID, allowNull: false })
  ticketId!: string;

  @BelongsTo(() => Ticket)
  ticket!: Ticket;

  @Column({ type: DataType.UUID, allowNull: true })
  userId!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  userName!: string | null;

  @Column({
    type: DataType.ENUM('agent', 'client'),
    allowNull: false,
    defaultValue: 'agent',
  })
  senderType!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message!: string;
}
