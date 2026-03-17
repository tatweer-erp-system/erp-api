import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { DownPaymentType } from '@/common/enums/pricelist.enums';

export enum CreateInvoiceType {
  REGULAR = 'regular',
  DOWN_PAYMENT_PERCENTAGE = 'down_payment_percentage',
  DOWN_PAYMENT_FIXED = 'down_payment_fixed',
}

export class CreateInvoiceFromSODto {
  @ApiProperty({
    enum: CreateInvoiceType,
    description: 'Invoice creation type — regular, or down payment (percentage/fixed)',
    default: CreateInvoiceType.REGULAR,
  })
  @IsEnum(CreateInvoiceType)
  type!: CreateInvoiceType;

  @ApiPropertyOptional({
    description: 'Value for down payment — percentage (1-100) or fixed amount',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  value?: number;
}
