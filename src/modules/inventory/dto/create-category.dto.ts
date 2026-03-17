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

  @ApiPropertyOptional({ description: 'Default income GL account for products in this category' })
  @IsOptional()
  @IsUUID()
  incomeAccountId?: string;

  @ApiPropertyOptional({ description: 'Default COGS GL account for products in this category' })
  @IsOptional()
  @IsUUID()
  cogsAccountId?: string;

  @ApiPropertyOptional({
    description: 'Default inventory GL account for products in this category',
  })
  @IsOptional()
  @IsUUID()
  inventoryAccountId?: string;
}
