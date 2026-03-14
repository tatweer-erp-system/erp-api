import { Table, Column, DataType } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { AppearanceTheme, AppearanceLanguage, AppearanceDensity } from '@/common/enums/user.enums';

@Table({
  tableName: 'user_appearance_settings',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class UserAppearance extends TenantAwareEntity<UserAppearance> {
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: AppearanceTheme.SYSTEM,
  })
  theme!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: '#1677ff',
  })
  primaryColor!: string;

  @Column({
    type: DataType.STRING(2),
    allowNull: false,
    defaultValue: AppearanceLanguage.EN,
  })
  language!: string;

  @Column({
    type: DataType.STRING(15),
    allowNull: false,
    defaultValue: AppearanceDensity.DEFAULT,
  })
  density!: string;
}
