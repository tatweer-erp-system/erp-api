import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Office Chair' })
  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @ApiProperty({ example: 'كرسي مكتب' })
  @IsString()
  @IsNotEmpty()
  nameAr!: string;

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
