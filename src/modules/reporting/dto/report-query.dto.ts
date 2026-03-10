import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date filter (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Module filter' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({
    description: 'Group results by time period',
    enum: ['day', 'week', 'month', 'quarter', 'year'],
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'quarter', 'year'])
  groupBy?: string;
}
