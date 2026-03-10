import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'notification_preferences', timestamps: true, paranoid: false, underscored: true })
export class NotificationPreference extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  channel!: string; // 'push' | 'email' | 'sms' | 'in_app'

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'event_type' })
  eventType!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  enabled!: boolean;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
