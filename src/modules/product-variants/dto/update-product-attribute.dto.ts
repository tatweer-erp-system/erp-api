import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { AttributeDisplayType } from '@/common/enums/product-variant.enums';

export class UpdateProductAttributeDto {
  @ApiPropertyOptional({ example: 'Color' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nameEn?: string;

  @ApiPropertyOptional({ example: 'اللون' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nameAr?: string;

  @ApiPropertyOptional({ enum: AttributeDisplayType })
  @IsOptional()
  @IsEnum(AttributeDisplayType)
  displayType?: AttributeDisplayType;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sequence?: number;

  @ApiProperty({ description: 'Optimistic locking version' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;
}
