import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import { LeaveAllocationMode, LeaveAllocationStatus } from '@/common/enums/hr.enums';

@Entity('leave_allocations')
export class LeaveAllocation extends BaseEntity {
  @ApiProperty({ example: 'uuid', nullable: true, description: 'null means all employees' })
  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId: string | null;

  @ApiProperty({ example: 'uuid' })
  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'leave_type_id', type: 'uuid' })
  leaveTypeId: string;

  @ApiProperty({ example: 2025 })
  @Column({ name: 'year', type: 'integer' })
  year: number;

  @ApiProperty({ example: '21.0000' })
  @Column({ name: 'number_of_days', type: 'decimal', precision: 10, scale: 4 })
  numberOfDays: string;

  @ApiProperty({ enum: LeaveAllocationMode, default: LeaveAllocationMode.FIXED })
  @Column({
    name: 'mode',
    type: 'enum',
    enum: LeaveAllocationMode,
    default: LeaveAllocationMode.FIXED,
  })
  mode: LeaveAllocationMode;

  @ApiProperty({ enum: LeaveAllocationStatus, default: LeaveAllocationStatus.DRAFT })
  @Column({
    name: 'status',
    type: 'enum',
    enum: LeaveAllocationStatus,
    default: LeaveAllocationStatus.DRAFT,
  })
  status: LeaveAllocationStatus;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approvedById: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}
