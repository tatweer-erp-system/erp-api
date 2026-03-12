import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'tenant_notes',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class TenantNote extends BaseEntity<TenantNote> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  content!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'normal' })
  priority!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'linked_ticket_id' })
  linkedTicketId!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'created_by_name' })
  createdByName!: string | null;
}
