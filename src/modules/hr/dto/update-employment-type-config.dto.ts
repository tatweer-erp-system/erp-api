import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, IsNumber } from 'class-validator';

export class UpdateEmploymentTypeConfigDto {
  @ApiPropertyOptional({ description: 'Employment type name in English', example: 'Full-time' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Employment type name in Arabic', example: 'دوام كامل' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Whether the employment type is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
