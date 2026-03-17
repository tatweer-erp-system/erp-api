import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { PricelistDiscountPolicy } from '@/common/enums/pricelist.enums';

export class CreatePricelistDto {
  @ApiProperty({ description: 'Pricelist name in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Pricelist name in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Currency ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({
    description: 'Discount policy',
    enum: PricelistDiscountPolicy,
    default: PricelistDiscountPolicy.DISCOUNT_ON_SALE,
  })
  @IsOptional()
  @IsEnum(PricelistDiscountPolicy)
  discountPolicy?: PricelistDiscountPolicy;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Whether the pricelist is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
