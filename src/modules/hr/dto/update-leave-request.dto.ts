import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsInt, IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Start date (ISO date)', example: '2024-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO date)', example: '2024-03-05' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Half-day leave', default: false })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Record version for optimistic locking', example: 1 })
  @IsNotEmpty()
  @IsInt()
  version!: number;
}
