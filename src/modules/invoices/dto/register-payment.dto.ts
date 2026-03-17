import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RegisterPaymentDto {
  @ApiProperty({ description: 'Payment date', example: '2026-03-17' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ description: 'Payment amount', example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Memo' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: 'Treasury account ID' })
  @IsOptional()
  @IsUUID()
  treasuryAccountId?: string;

  @ApiPropertyOptional({ description: 'Currency ID (defaults to invoice currency)' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ description: 'Exchange rate', default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate?: number;
}
