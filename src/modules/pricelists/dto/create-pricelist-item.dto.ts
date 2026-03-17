import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsNumber, IsDateString, IsInt, Min } from 'class-validator';
import { PricelistApplyOn, PricelistComputation } from '@/common/enums/pricelist.enums';

export class CreatePricelistItemDto {
  @ApiPropertyOptional({
    description: 'What the rule applies to',
    enum: PricelistApplyOn,
    default: PricelistApplyOn.ALL,
  })
  @IsOptional()
  @IsEnum(PricelistApplyOn)
  applyOn?: PricelistApplyOn;

  @ApiPropertyOptional({ description: 'Product ID (required if applyOn=product)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Category ID (required if applyOn=category)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Minimum quantity for this rule', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQty?: number;

  @ApiPropertyOptional({
    description: 'Computation method',
    enum: PricelistComputation,
    default: PricelistComputation.FIXED,
  })
  @IsOptional()
  @IsEnum(PricelistComputation)
  computation?: PricelistComputation;

  @ApiPropertyOptional({ description: 'Fixed price (used when computation=fixed)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Discount percentage (used when computation=percentage)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPct?: number;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Sort sequence', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sequence?: number;
}
