import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { PricelistApplyOn, PricelistComputationType } from '@/common/enums/inventory.enums';

export class CreatePricelistItemDto {
  @ApiProperty({ enum: PricelistApplyOn, example: PricelistApplyOn.PRODUCT })
  @IsEnum(PricelistApplyOn)
  applyOn!: PricelistApplyOn;

  @ApiPropertyOptional({ description: 'Required when applyOn = product' })
  @ValidateIf((o) => o.applyOn === PricelistApplyOn.PRODUCT)
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Required when applyOn = product_category' })
  @ValidateIf((o) => o.applyOn === PricelistApplyOn.PRODUCT_CATEGORY)
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 0, description: 'Minimum quantity to trigger this rule' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQty?: number;

  @ApiProperty({ enum: PricelistComputationType, example: PricelistComputationType.PERCENTAGE })
  @IsEnum(PricelistComputationType)
  computationType!: PricelistComputationType;

  @ApiPropertyOptional({ description: 'Required when computationType = fixed' })
  @ValidateIf((o) => o.computationType === PricelistComputationType.FIXED)
  @IsNumber()
  @Min(0)
  fixedPrice?: number;

  @ApiPropertyOptional({ description: 'Discount % — required when computationType = percentage' })
  @ValidateIf((o) => o.computationType === PricelistComputationType.PERCENTAGE)
  @IsNumber()
  @Min(0)
  percentDiscount?: number;

  @ApiPropertyOptional({ description: 'Base price for formula computation' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  formulaPriceBasis?: number;

  @ApiPropertyOptional({ description: 'Discount off the formula base price (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  formulaDiscount?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateStart?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateEnd?: string;
}
