import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GeneratePayslipsDto {
  @ApiProperty({ description: 'Period start date (YYYY-MM-DD)', example: '2026-03-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ description: 'Period end date (YYYY-MM-DD)', example: '2026-03-31' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ description: 'Salary structure ID to use', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  structureId?: string;

  @ApiPropertyOptional({ description: 'Branch ID — defaults to user branch', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
