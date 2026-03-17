import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { LeaveAllocationMode } from '@/common/enums/hr-new.enums';

export class CreateLeaveAllocationDto {
  @ApiProperty({ description: 'Employee ID', format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ description: 'Leave type ID', format: 'uuid' })
  @IsUUID()
  leaveTypeId!: string;

  @ApiProperty({ description: 'Allocation year', example: 2026 })
  @IsNumber()
  year!: number;

  @ApiProperty({ description: 'Number of days allocated', example: 21 })
  @IsNumber()
  @Min(0)
  numberOfDays!: number;

  @ApiPropertyOptional({
    description: 'Allocation mode',
    enum: LeaveAllocationMode,
    default: LeaveAllocationMode.MANUAL,
  })
  @IsOptional()
  @IsEnum(LeaveAllocationMode)
  mode?: LeaveAllocationMode;

  @ApiPropertyOptional({ description: 'Branch ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
