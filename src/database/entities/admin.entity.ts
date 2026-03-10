import {
  Column,
  DataType,
  Table,
  Default,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Model,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'admins',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Admin extends Model {
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

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.DATE, allowNull: true, field: 'last_login_at' })
  lastLoginAt!: Date | null;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
