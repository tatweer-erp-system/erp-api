import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TreasuryTransactionType } from '@/common/enums/accounting.enums';

export class CreateTreasuryTransactionDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    enum: [
      TreasuryTransactionType.RECEIPT,
      TreasuryTransactionType.PAYMENT,
      TreasuryTransactionType.OPENING_BALANCE,
    ],
  })
  @IsEnum([
    TreasuryTransactionType.RECEIPT,
    TreasuryTransactionType.PAYMENT,
    TreasuryTransactionType.OPENING_BALANCE,
  ])
  type!:
    | TreasuryTransactionType.RECEIPT
    | TreasuryTransactionType.PAYMENT
    | TreasuryTransactionType.OPENING_BALANCE;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-03-13' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Deprecated: use partnerId instead' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Partner (customer/vendor) ID' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Link to a payment record' })
  @IsOptional()
  @IsUUID()
  paymentId?: string;
}
