import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID, IsNumber, IsInt, Min } from 'class-validator';

export class CreateSupplierProductDto {
  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Partner (supplier) ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  partnerId!: string;

  @ApiPropertyOptional({ description: 'Minimum order quantity', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQty?: number;

  @ApiProperty({ description: 'Supplier price for this product' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: 'Currency ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ description: 'Lead time in days', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional({ description: 'Display sequence', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sequence?: number;
}
