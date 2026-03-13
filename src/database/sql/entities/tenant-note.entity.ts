import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'tenant_notes',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TenantNote extends BaseEntity<TenantNote> {
  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  content!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'normal' })
  priority!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  linkedTicketId!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  createdByName!: string | null;
}
