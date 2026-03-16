import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { AdjustmentReasonType } from '@/common/enums/definitions.enums';

@Table({
  tableName: 'adjustment_reasons',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class AdjustmentReason extends TenantAwareEntity<AdjustmentReason> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  type!: AdjustmentReasonType;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
