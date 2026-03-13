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
  @ApiProperty({ example: 'Gold' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

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
