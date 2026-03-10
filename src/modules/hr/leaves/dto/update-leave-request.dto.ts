import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Start date (ISO date)', example: '2024-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO date)', example: '2024-03-05' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  reason?: string;
}
