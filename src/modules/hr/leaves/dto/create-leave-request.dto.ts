import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ example: 'annual' })
  @IsString()
  leaveType!: string;

  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2024-06-05' })
  @IsDateString()
  endDate!: string;

  @ApiProperty()
  @IsNumber()
  daysRequested!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
