import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { VoucherDiscountType } from '@/common/enums/definitions.enums';

export class UpdateVoucherTypeDto {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ description: 'English name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Arabic name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'English description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Arabic description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;

  @ApiPropertyOptional({ enum: VoucherDiscountType, description: 'Discount type' })
  @IsOptional()
  @IsEnum(VoucherDiscountType)
  discountType?: VoucherDiscountType;

  @ApiPropertyOptional({ description: 'Discount value' })
  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount to apply voucher' })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Number of days the voucher is valid' })
  @IsOptional()
  @IsNumber()
  @IsInt()
  validDays?: number;

  @ApiPropertyOptional({ description: 'Maximum number of uses' })
  @IsOptional()
  @IsNumber()
  @IsInt()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Whether this voucher type is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
