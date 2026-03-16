import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import { LeaveAllocationMode } from '@/common/enums/hr.enums';

@Entity('leave_types')
export class LeaveType extends BaseEntity {
  @ApiProperty({ example: 'Annual Leave' })
  @Column({ name: 'name_en', type: 'varchar', length: 255 })
  nameEn: string;

  @ApiProperty({ example: 'إجازة سنوية' })
  @Column({ name: 'name_ar', type: 'varchar', length: 255 })
  nameAr: string;

  @ApiProperty({ enum: LeaveAllocationMode, default: LeaveAllocationMode.FIXED })
  @Column({
    name: 'allocation_mode',
    type: 'enum',
    enum: LeaveAllocationMode,
    default: LeaveAllocationMode.FIXED,
  })
  allocationMode: LeaveAllocationMode;

  @ApiProperty({ example: true })
  @Column({ name: 'requires_approval', type: 'boolean', default: true })
  requiresApproval: boolean;

  @ApiProperty({ example: '#4CAF50', nullable: true })
  @Column({ name: 'color', type: 'varchar', length: 20, nullable: true })
  color: string | null;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
