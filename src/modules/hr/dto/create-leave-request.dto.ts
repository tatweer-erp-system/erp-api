import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { LeaveType } from '@/common/enums/hr.enums';

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'Employee ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({
    description: 'Type of leave',
    enum: LeaveType,
    example: 'annual',
  })
  @IsNotEmpty()
  @IsEnum(LeaveType)
  leaveType!: LeaveType;

  @ApiProperty({ description: 'Start date (ISO date)', example: '2024-03-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO date)', example: '2024-03-05' })
  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  reason?: string;
}
