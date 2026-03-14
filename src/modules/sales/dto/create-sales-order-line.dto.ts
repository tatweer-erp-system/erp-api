import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { SalesDiscountType } from '@/common/enums/crm.enums';

export class CreateSalesOrderLineDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 5, description: 'Quantity — must be at least 1' })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 100, description: 'Unit price in order currency' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ enum: SalesDiscountType, description: 'Line-level discount type' })
  @IsOptional()
  @IsEnum(SalesDiscountType)
  discountType?: string;

  @ApiPropertyOptional({ example: 10, description: 'Line-level discount value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ example: 15, description: 'Tax rate percentage — defaults to 15' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Free-text line description' })
  @IsOptional()
  @IsString()
  description?: string;
}
