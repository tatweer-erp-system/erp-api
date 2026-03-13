import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ReportGranularity } from '@/common/enums/reporting.enums';

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
    enum: ReportGranularity,
  })
  @IsOptional()
  @IsEnum(ReportGranularity)
  groupBy?: ReportGranularity;
}
