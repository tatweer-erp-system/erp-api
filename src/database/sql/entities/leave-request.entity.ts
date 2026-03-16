import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import { LeaveRequestStatus, HalfDayTime } from '@/common/enums/hr.enums';

@Entity('leave_requests')
export class LeaveRequest extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'uuid' })
  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'leave_type_id', type: 'uuid' })
  leaveTypeId: string;

  @ApiProperty({ example: '2025-06-01' })
  @Column({ name: 'date_from', type: 'date' })
  dateFrom: string;

  @ApiProperty({ example: '2025-06-05' })
  @Column({ name: 'date_to', type: 'date' })
  dateTo: string;

  @ApiProperty({ example: '5.0000' })
  @Column({ name: 'days', type: 'decimal', precision: 10, scale: 4 })
  days: string;

  @ApiProperty({ example: false })
  @Column({ name: 'is_half_day', type: 'boolean', default: false })
  isHalfDay: boolean;

  @ApiProperty({ enum: HalfDayTime, nullable: true })
  @Column({ name: 'half_day_time', type: 'enum', enum: HalfDayTime, nullable: true })
  halfDayTime: HalfDayTime | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: LeaveRequestStatus, default: LeaveRequestStatus.DRAFT })
  @Column({
    name: 'status',
    type: 'enum',
    enum: LeaveRequestStatus,
    default: LeaveRequestStatus.DRAFT,
  })
  status: LeaveRequestStatus;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approvedById: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'refusal_reason', type: 'text', nullable: true })
  refusalReason: string | null;
}
