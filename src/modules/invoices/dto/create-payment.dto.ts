import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsDateString, IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentTypeNew } from '@/common/enums/invoice.enums';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ description: 'Partner (customer/vendor) ID' })
  @IsUUID()
  partnerId!: string;

  @ApiProperty({ enum: PaymentTypeNew, description: 'Payment type' })
  @IsEnum(PaymentTypeNew)
  paymentType!: PaymentTypeNew;

  @ApiProperty({ description: 'Payment date', example: '2026-03-17' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ description: 'Payment amount', example: 1000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Currency ID' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ description: 'Exchange rate', default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Memo / notes' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: 'Treasury account ID' })
  @IsOptional()
  @IsUUID()
  treasuryAccountId?: string;

  @ApiPropertyOptional({ description: 'Journal ID' })
  @IsOptional()
  @IsUUID()
  journalId?: string;
}
