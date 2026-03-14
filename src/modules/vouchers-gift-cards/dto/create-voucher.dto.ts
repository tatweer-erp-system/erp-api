import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType } from '@/common/enums/pos.enums';

export class CreateVoucherDto {
  @ApiProperty({ example: 'SUMMER2026', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({
    description: 'Voucher name in English',
    example: 'Summer Discount',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ description: 'Voucher name in Arabic', example: 'خصم الصيف', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameAr!: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'Get 10% off on all orders',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({
    description: 'Description in Arabic',
    example: 'احصل على خصم 10% على جميع الطلبات',
  })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ example: 'discount', default: 'discount' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @ApiProperty({ example: DiscountType.PERCENT, enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ example: 10.0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  discountValue!: number;

  @ApiPropertyOptional({ example: 50.0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxUsesPerCustomer?: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
