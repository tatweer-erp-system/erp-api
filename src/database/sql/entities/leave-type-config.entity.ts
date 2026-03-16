import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'leave_types_config',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class LeaveTypeConfig extends TenantAwareEntity<LeaveTypeConfig> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  daysPerYear!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isPaid!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  requiresApproval!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
