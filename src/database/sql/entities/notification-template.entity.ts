import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'notification_templates',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class NotificationTemplate extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'event_type' })
  eventType!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  channel!: string; // 'push' | 'email' | 'sms'

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'subject_en' })
  subjectEn!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'subject_ar' })
  subjectAr!: string | null;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'body_en' })
  bodyEn!: string;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'body_ar' })
  bodyAr!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_default' })
  isDefault!: boolean;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE, field: 'created_at' }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE, field: 'updated_at' }) updatedAt!: Date;
}
