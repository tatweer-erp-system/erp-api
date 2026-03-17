import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, IsBoolean } from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'Employee ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({
    description: 'Leave Type ID (FK to leave_types table)',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  leaveTypeId!: string;

  @ApiProperty({ description: 'Start date (ISO date)', example: '2024-03-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO date)', example: '2024-03-05' })
  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Half-day leave', default: false })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  reason?: string;
}
