import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsIn, IsDateString } from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'Employee ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({
    description: 'Type of leave',
    enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid'],
    example: 'annual',
  })
  @IsNotEmpty()
  @IsIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid'])
  leaveType!: string;

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
