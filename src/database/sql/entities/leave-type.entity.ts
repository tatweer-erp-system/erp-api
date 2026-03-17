import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'leave_types',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class LeaveTypeEntity extends TenantAwareEntity<LeaveTypeEntity> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  color!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  requiresApproval!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  allowNegative!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
