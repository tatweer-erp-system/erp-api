import { Table, Column, DataType } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class User extends TenantAwareEntity<User> {
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

  // Role removed — users get roles through user_roles junction table only

  @Column({ type: DataType.JSONB, defaultValue: [], field: 'extra_permissions' })
  extraPermissions!: string[];

  @Column({ type: DataType.JSONB, defaultValue: [], field: 'revoked_permissions' })
  revokedPermissions!: string[];
}
