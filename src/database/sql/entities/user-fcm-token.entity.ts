import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'user_fcm_tokens',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class UserFcmToken extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  token!: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  deviceType!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  deviceId!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE }) updatedAt!: Date;
}
