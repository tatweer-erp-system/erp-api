import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsNumber, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { LocalizedString } from '../../../../common/types/i18n.types';

export class CreateProductDto {
  @ApiProperty({ example: { en: 'Office Chair', ar: 'كرسي مكتب' } })
  @IsObject()
  name!: LocalizedString;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  description?: LocalizedString;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty()
  @IsNumber()
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reorderPoint?: number;
}
