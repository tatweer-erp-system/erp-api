import { Table } from 'sequelize-typescript';
import { Column, DataType, Default, PrimaryKey, CreatedAt, UpdatedAt, DeletedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'users', timestamps: true, paranoid: true, underscored: true })
export class User extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'password_hash' })
  passwordHash!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'first_name' })
  firstName!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'last_name' })
  lastName!: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true, field: 'avatar_url' })
  avatarUrl!: string | null;

  @Column({ type: DataType.STRING(5), defaultValue: 'en', field: 'preferred_lang' })
  preferredLang!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.DATE, allowNull: true, field: 'last_login_at' })
  lastLoginAt!: Date | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, field: 'failed_login_attempts' })
  failedLoginAttempts!: number;

  @Column({ type: DataType.DATE, allowNull: true, field: 'locked_until' })
  lockedUntil!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
