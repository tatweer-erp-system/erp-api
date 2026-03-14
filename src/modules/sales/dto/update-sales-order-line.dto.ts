import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { SalesDiscountType } from '@/common/enums/crm.enums';

/**
 * Update DTO for a single sales order line.
 */
export class UpdateSalesOrderLineDto {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ example: 5, description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 100, description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ enum: SalesDiscountType, description: 'Line-level discount type' })
  @IsOptional()
  @IsEnum(SalesDiscountType)
  discountType?: string;

  @ApiPropertyOptional({ example: 10, description: 'Line-level discount value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ example: 15, description: 'Tax rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Free-text line description' })
  @IsOptional()
  @IsString()
  description?: string;
}
