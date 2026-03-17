import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { LeaveAllocationMode, LeaveAllocationStatus } from '@/common/enums/hr-new.enums';

@Table({
  tableName: 'leave_allocations',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class LeaveAllocation extends TenantAwareEntity<LeaveAllocation> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  employeeId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  leaveTypeId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  year!: number;

  @Column({ type: DataType.DECIMAL(8, 2), allowNull: false })
  numberOfDays!: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: LeaveAllocationMode.MANUAL,
  })
  mode!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: LeaveAllocationStatus.DRAFT,
  })
  status!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  approvedById!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  approvedAt!: Date | null;
}
