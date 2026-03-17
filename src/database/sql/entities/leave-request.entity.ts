import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { LeaveStatus } from '@/common/enums/hr.enums';

@Table({
  tableName: 'leave_requests',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class LeaveRequest extends TenantAwareEntity<LeaveRequest> {
  @Column({ type: DataType.UUID, allowNull: false })
  employeeId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  leaveTypeId!: string;

  /** @deprecated Kept for backward compatibility with old data. New records use leaveTypeId. */
  @Column({ type: DataType.STRING(50), allowNull: true })
  leaveType!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  startDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  endDate!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  daysRequested!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  reason!: string | null;

  @Column({
    type: DataType.STRING(20),
    defaultValue: LeaveStatus.PENDING,
  })
  status!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  approvedBy!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  approvedAt!: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  rejectionReason!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isHalfDay!: boolean;

  @Column({ type: DataType.STRING(20), allowNull: true })
  halfDayPeriod!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  refusalReason!: string | null;
}
