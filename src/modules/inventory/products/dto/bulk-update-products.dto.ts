import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkUpdateProductItemDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name_en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name_ar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description_en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description_ar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkUpdateProductsDto {
  @ApiProperty({ type: [BulkUpdateProductItemDto] })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateProductItemDto)
  @ArrayMaxSize(100)
  @ArrayMinSize(1)
  items!: BulkUpdateProductItemDto[];
}
