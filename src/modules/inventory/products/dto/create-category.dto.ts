import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  name_en!: string;

  @ApiProperty({ example: 'إلكترونيات' })
  @IsString()
  @IsNotEmpty()
  name_ar!: string;

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
  parentId?: string;
}
