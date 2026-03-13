import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ReportModule, ExportFormat } from '@/common/enums/reporting.enums';

export class ExportReportDto {
  @ApiProperty({
    description: 'Type of report to export',
    enum: ReportModule,
  })
  @IsNotEmpty()
  @IsEnum(ReportModule)
  reportType!: ReportModule;

  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
  })
  @IsNotEmpty()
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @ApiPropertyOptional({ description: 'Start date filter (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
