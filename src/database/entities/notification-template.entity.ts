import {
  Column,
  DataType,
  Table,
  Default,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Model,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'notification_templates',
  timestamps: true,
  paranoid: false,
  underscored: true,
})
export class NotificationTemplate extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

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

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
