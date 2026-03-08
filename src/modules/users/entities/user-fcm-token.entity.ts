import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'user_fcm_tokens', timestamps: true, paranoid: false, underscored: true })
export class UserFcmToken extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  token!: string;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'device_type' })
  deviceType!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'device_id' })
  deviceId!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}
