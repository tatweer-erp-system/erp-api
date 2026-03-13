import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'notification_templates',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class NotificationTemplate extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  eventType!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  channel!: string; // 'push' | 'email' | 'sms'

  @Column({ type: DataType.STRING(255), allowNull: true })
  subjectEn!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  subjectAr!: string | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  bodyEn!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  bodyAr!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isDefault!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE }) updatedAt!: Date;
}
