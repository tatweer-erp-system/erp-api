import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'admins',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Admin extends BaseEntity<Admin> {
  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  passwordHash!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  firstName!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  lastName!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'admin',
  })
  role!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  lastLoginAt!: Date | null;
}
