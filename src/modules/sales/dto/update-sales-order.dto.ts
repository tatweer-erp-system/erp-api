import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SalesDiscountType } from '@/common/enums/crm.enums';
import { CreateSalesOrderLineDto } from './create-sales-order-line.dto';

/**
 * Update DTO for sales orders (draft only).
 * Replaces all lines when `lines` is provided.
 */
export class UpdateSalesOrderDto {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ description: 'Partner (customer) ID' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Pricelist ID' })
  @IsOptional()
  @IsUUID()
  pricelistId?: string;

  @ApiPropertyOptional({ description: 'Payment term ID' })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Salesperson (user) ID' })
  @IsOptional()
  @IsUUID()
  salespersonId?: string;

  @ApiPropertyOptional({ description: 'Fiscal position ID' })
  @IsOptional()
  @IsUUID()
  fiscalPositionId?: string;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: SalesDiscountType, description: 'Order-level discount type' })
  @IsOptional()
  @IsEnum(SalesDiscountType)
  discountType?: string;

  @ApiPropertyOptional({ description: 'Order-level discount value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({
    type: [CreateSalesOrderLineDto],
    description: 'Replace all lines — at least one required if provided',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  @ArrayMinSize(1)
  lines?: CreateSalesOrderLineDto[];
}
