import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '@/database/sql/base.entity';
import { SettingValueType } from '@/common/enums/settings.enums';

@Table({
  tableName: 'system_settings',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class SystemSetting extends BaseEntity<SystemSetting> {
  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  key!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  value!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: false, defaultValue: 'general' })
  group!: string;

  @Column({
    type: DataType.ENUM(...Object.values(SettingValueType)),
    allowNull: false,
    defaultValue: SettingValueType.STRING,
  })
  type!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  description!: string | null;
}
