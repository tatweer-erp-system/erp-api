import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DiscountType } from '@/common/enums/pos.enums';

export class PaymentEntryDto {
  @ApiProperty({ description: 'Payment method', example: 'cash' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  method!: string;

  @ApiProperty({ description: 'Payment amount', example: 100 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Amount given (for cash payments)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountGiven?: number;

  @ApiPropertyOptional({ description: 'Payment reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ description: 'Gift card ID' })
  @IsOptional()
  @IsUUID()
  giftCardId?: string;

  @ApiPropertyOptional({ description: 'Gift card code (for gift_card payment method)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  giftCardCode?: string;

  @ApiPropertyOptional({ description: 'Points to redeem (for loyalty_points payment method)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pointsToRedeem?: number;
}

export class DiscountDto {
  @ApiProperty({ enum: DiscountType, description: 'Discount type' })
  @IsEnum(DiscountType)
  type!: DiscountType;

  @ApiProperty({ description: 'Discount value', example: 10 })
  @IsNumber()
  @Min(0)
  value!: number;
}

export class CheckoutDto {
  @ApiProperty({ type: [PaymentEntryDto], description: 'Payment entries' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentEntryDto)
  payments!: PaymentEntryDto[];

  @ApiPropertyOptional({ type: DiscountDto, description: 'Order-level discount' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;

  @ApiPropertyOptional({ description: 'Tip amount', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @ApiPropertyOptional({ description: 'Voucher code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Warehouse ID for stock deduction' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Currency ID for this order (defaults to tenant base currency)',
  })
  @IsOptional()
  @IsUUID()
  currencyId?: string;
}
