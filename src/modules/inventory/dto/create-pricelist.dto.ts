import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PricelistDiscountPolicy } from '@/common/enums/inventory.enums';

export class CreatePricelistDto {
  @ApiProperty({ example: 'Retail Pricelist' })
  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @ApiProperty({ example: 'قائمة أسعار التجزئة' })
  @IsString()
  @IsNotEmpty()
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Currency ID — defaults to tenant base currency if omitted' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiProperty({ enum: PricelistDiscountPolicy, example: PricelistDiscountPolicy.DISCOUNT_ON_SALE })
  @IsEnum(PricelistDiscountPolicy)
  discountPolicy!: PricelistDiscountPolicy;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
