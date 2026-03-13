import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, Min, ValidateIf } from 'class-validator';

export class CreateJournalLineDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiProperty({
    example: 1000.0,
    description:
      'Debit amount in base currency (SAR). Either debit or credit must be > 0, not both.',
  })
  @IsNumber()
  @Min(0)
  debit!: number;

  @ApiProperty({
    example: 0,
    description:
      'Credit amount in base currency (SAR). Either debit or credit must be > 0, not both.',
  })
  @IsNumber()
  @Min(0)
  credit!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Currency code (e.g. SAR, USD). Defaults to base currency.' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({
    description: 'Amount in the original currency (before conversion to SAR).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountCurrency?: number;

  @ApiPropertyOptional({ description: 'Exchange rate used at time of posting.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;
}
