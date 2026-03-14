import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ExchangeRateSource } from '@/common/enums/accounting.enums';

export class CreateExchangeRateDto {
  @ApiProperty({ description: 'Source currency UUID' })
  @IsUUID()
  fromCurrencyId!: string;

  @ApiProperty({ description: 'Target currency UUID' })
  @IsUUID()
  toCurrencyId!: string;

  @ApiProperty({
    description: 'Exchange rate (amount of toCurrency per 1 fromCurrency)',
    example: 3.75,
  })
  @IsNumber()
  @Min(0.000001)
  rate!: number;

  @ApiProperty({ description: 'Rate date (YYYY-MM-DD)', example: '2026-03-13' })
  @IsDateString()
  rateDate!: string;

  @ApiPropertyOptional({
    description: 'Source of the rate',
    enum: ExchangeRateSource,
    default: ExchangeRateSource.MANUAL,
  })
  @IsOptional()
  @IsEnum(ExchangeRateSource)
  source?: ExchangeRateSource;
}
