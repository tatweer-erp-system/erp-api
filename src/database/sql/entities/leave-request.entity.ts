import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'leave_requests',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class LeaveRequest extends TenantAwareEntity<LeaveRequest> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'employee_id' })
  employeeId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'leave_type' })
  leaveType!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'start_date' })
  startDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'end_date' })
  endDate!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'days_requested' })
  daysRequested!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  reason!: string | null;

  @Column({ type: DataType.STRING(20), defaultValue: 'pending' })
  status!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'approved_by' })
  approvedBy!: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'approved_at' })
  approvedAt!: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'rejection_reason' })
  rejectionReason!: string | null;
}
