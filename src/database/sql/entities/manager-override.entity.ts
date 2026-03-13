import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'manager_overrides',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class ManagerOverride extends TenantAwareEntity<ManagerOverride> {
  @Column({ type: DataType.UUID, allowNull: false })
  sessionId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  orderId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: false })
  actionType!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  requestedBy!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  approvedBy!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  details!: Record<string, unknown>;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
