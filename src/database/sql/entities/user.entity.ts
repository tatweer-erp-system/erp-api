import { Table, Column, DataType } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class User extends TenantAwareEntity<User> {
  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  passwordHash!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  firstNameEn!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  firstNameAr!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  lastNameEn!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  lastNameAr!: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  avatarUrl!: string | null;

  @Column({ type: DataType.STRING(5), defaultValue: 'en' })
  preferredLang!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  lastLoginAt!: Date | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  failedLoginAttempts!: number;

  @Column({ type: DataType.DATE, allowNull: true })
  lockedUntil!: Date | null;

  // Role removed — users get roles through user_roles junction table only

  @Column({ type: DataType.STRING(255), allowNull: true })
  pinHash!: string | null;

  @Column({ type: DataType.JSONB, defaultValue: [] })
  extraPermissions!: string[];

  @Column({ type: DataType.JSONB, defaultValue: [] })
  revokedPermissions!: string[];
}
