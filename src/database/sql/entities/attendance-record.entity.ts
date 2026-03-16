import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import { AttendanceStatus } from '@/common/enums/hr.enums';

@Entity('attendance_records')
export class AttendanceRecord extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'uuid' })
  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ example: '2025-06-01' })
  @Column({ name: 'date', type: 'date' })
  date: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'check_in', type: 'timestamptz', nullable: true })
  checkIn: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'check_out', type: 'timestamptz', nullable: true })
  checkOut: Date | null;

  @ApiProperty({ example: '8.0000' })
  @Column({ name: 'worked_hours', type: 'decimal', precision: 10, scale: 4, default: 0 })
  workedHours: string;

  @ApiProperty({ example: '0.0000' })
  @Column({ name: 'overtime_hours', type: 'decimal', precision: 10, scale: 4, default: 0 })
  overtimeHours: string;

  @ApiProperty({ example: '0.0000' })
  @Column({ name: 'late_minutes', type: 'decimal', precision: 10, scale: 4, default: 0 })
  lateMinutes: string;

  @ApiProperty({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  @Column({
    name: 'status',
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @ApiProperty({ nullable: true })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}
