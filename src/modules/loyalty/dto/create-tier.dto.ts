import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateTierDto {
  @ApiProperty({ description: 'Tier name in English', example: 'Gold' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ description: 'Tier name in Arabic', example: 'ذهبي' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Tier description in English' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Tier description in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum lifetime points to qualify' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minPoints?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Earn rate multiplier' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  earnMultiplier?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Redeem rate multiplier' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  redeemMultiplier?: number;

  @ApiPropertyOptional({ example: '#FFD700' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: ['Free delivery', '10% birthday discount'] })
  @IsOptional()
  @IsArray()
  benefits?: unknown[];

  @ApiPropertyOptional({ example: 0, description: 'Display sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
