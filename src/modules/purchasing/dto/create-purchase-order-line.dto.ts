import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePurchaseOrderLineDto {
  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ description: 'Product variant ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Unit price', minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Tax rate (percentage)', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Discount amount for this line', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsOptional()
  @IsString()
  description?: string;
}
