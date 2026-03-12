import { Column, DataType, Table, HasMany } from 'sequelize-typescript';
import { TenantAwareEntity } from '@/database/sql/base.entity';
import { TicketReply } from './ticket-reply.entity';

@Table({
  tableName: 'tickets',
  timestamps: true,
  paranoid: true,
  underscored: true,
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

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'tenant_name' })
  tenantName!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'created_by_name' })
  createdByName!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'assigned_to' })
  assignedTo!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'assigned_to_name' })
  assignedToName!: string | null;

  @HasMany(() => TicketReply)
  replies!: TicketReply[];
}
