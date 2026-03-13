import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '@/database/sql/base.entity';

@Table({
  tableName: 'settings',
  timestamps: true,
  schema: 'public',
})
export class Setting extends TenantAwareEntity<Setting> {
  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  key!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  value!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: false, defaultValue: 'general' })
  group!: string;

  @Column({
    type: DataType.ENUM('string', 'number', 'boolean', 'json'),
    allowNull: false,
    defaultValue: 'string',
  })
  type!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  description!: string | null;
}
