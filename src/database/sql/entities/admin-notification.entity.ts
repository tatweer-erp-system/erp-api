import { Column, DataType, ForeignKey, BelongsTo, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';
import { Admin } from './admin.entity';

@Table({
  tableName: 'admin_notifications',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class AdminNotification extends BaseEntity<AdminNotification> {
  @ForeignKey(() => Admin)
  @Column({ type: DataType.UUID, allowNull: false })
  adminId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  type!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  title!: string;

  @Column({ type: DataType.TEXT })
  body!: string;

  @Column({ type: DataType.JSONB, defaultValue: {} })
  data!: Record<string, unknown>;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isRead!: boolean;

  @Column({ type: DataType.DATE })
  readAt!: Date | null;

  @BelongsTo(() => Admin)
  admin!: Admin;
}
