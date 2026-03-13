import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Source of the rate', example: 'manual', default: 'manual' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  source?: string;
}
