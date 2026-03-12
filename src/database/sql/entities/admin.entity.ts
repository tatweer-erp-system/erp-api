import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'admins',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Admin extends BaseEntity<Admin> {
  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'password_hash' })
  passwordHash!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'first_name' })
  firstName!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'last_name' })
  lastName!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'admin',
  })
  role!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.DATE, allowNull: true, field: 'last_login_at' })
  lastLoginAt!: Date | null;
}
