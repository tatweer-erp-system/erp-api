import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryExchangeRateDto {
  @ApiPropertyOptional({ description: 'Source currency UUID' })
  @IsOptional()
  @IsUUID()
  from?: string;

  @ApiPropertyOptional({ description: 'Target currency UUID' })
  @IsOptional()
  @IsUUID()
  to?: string;

  @ApiPropertyOptional({ description: 'Rate date (YYYY-MM-DD)', example: '2026-03-13' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class RateHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Currency UUID to retrieve rate history for' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;
}
