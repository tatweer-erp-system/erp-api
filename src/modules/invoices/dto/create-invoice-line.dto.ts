import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsUUID, IsArray, Min, Max, IsInt } from 'class-validator';

export class CreateInvoiceLineDto {
  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Product variant ID' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiProperty({ description: 'Line description', example: 'Product A' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity!: number;

  @ApiProperty({ description: 'Unit price', example: 100 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Discount percentage (0-100)', example: 0, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPct?: number;

  @ApiPropertyOptional({ description: 'Tax IDs to apply', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  taxIds?: string[];

  @ApiPropertyOptional({ description: 'GL account ID for the line' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Display sequence', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sequence?: number;
}
