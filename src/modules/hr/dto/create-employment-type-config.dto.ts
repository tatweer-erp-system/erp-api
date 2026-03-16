import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateEmploymentTypeConfigDto {
  @ApiProperty({ description: 'Employment type name in English', example: 'Full-time' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Employment type name in Arabic', example: 'دوام كامل' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'Standard full-time employment',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic', example: 'توظيف بدوام كامل' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Whether the employment type is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
