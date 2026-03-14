import { IsOptional, IsInt, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAccountingConfigDto {
  @ApiPropertyOptional({ description: 'Fiscal year start month (1-12)', minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @ApiPropertyOptional({ description: 'VAT rate percentage (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({
    description: 'Salary calculation basis',
    enum: ['actualDays', 'fixed30'],
  })
  @IsOptional()
  @IsIn(['actualDays', 'fixed30'])
  salaryCalculationBasis?: string;
}
