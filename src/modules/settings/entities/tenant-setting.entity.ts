import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '@/database/sql/base.entity';
import { SettingValueType } from '@/common/enums/settings.enums';

@Table({
  tableName: 'tenant_settings',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TenantSetting extends TenantAwareEntity<TenantSetting> {
  @Column({ type: DataType.STRING(255), allowNull: false })
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
