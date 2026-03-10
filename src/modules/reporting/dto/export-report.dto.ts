import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn, IsDateString } from 'class-validator';

export class ExportReportDto {
  @ApiProperty({
    description: 'Type of report to export',
    enum: ['sales', 'inventory', 'hr', 'financial', 'crm'],
  })
  @IsNotEmpty()
  @IsIn(['sales', 'inventory', 'hr', 'financial', 'crm'])
  reportType!: string;

  @ApiProperty({
    description: 'Export format',
    enum: ['pdf', 'csv', 'xlsx'],
  })
  @IsNotEmpty()
  @IsIn(['pdf', 'csv', 'xlsx'])
  format!: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
