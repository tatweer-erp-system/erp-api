import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @ApiProperty({ example: 'إلكترونيات' })
  @IsString()
  @IsNotEmpty()
  nameAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
