import { Column, DataType, Table, HasMany } from 'sequelize-typescript';
import { TenantAwareEntity } from '@/database/sql/base.entity';
import { TicketReply } from './ticket-reply.entity';

@Table({
  tableName: 'tickets',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Ticket extends TenantAwareEntity<Ticket> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  subject!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({
    type: DataType.ENUM('open', 'in_progress', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'open',
  })
  status!: string;

  @Column({
    type: DataType.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
  })
  priority!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  tenantName!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  createdByName!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  assignedTo!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  assignedToName!: string | null;

  @HasMany(() => TicketReply)
  replies!: TicketReply[];
}
