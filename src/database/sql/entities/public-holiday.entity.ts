import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'public_holidays',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PublicHoliday extends TenantAwareEntity<PublicHoliday> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isRecurring!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
