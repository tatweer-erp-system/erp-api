import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { VoidRefundReasonType } from '@/common/enums/definitions.enums';

@Table({
  tableName: 'void_refund_reasons',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class VoidRefundReason extends TenantAwareEntity<VoidRefundReason> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: VoidRefundReasonType.BOTH })
  type!: VoidRefundReasonType;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  requiresManager!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
