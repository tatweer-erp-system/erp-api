import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'notifications',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Notification extends TenantAwareEntity<Notification> {
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  type!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  title!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  body!: string | null;

  @Column({ type: DataType.JSONB, defaultValue: {} })
  data!: Record<string, unknown>;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isRead!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  readAt!: Date | null;
}
