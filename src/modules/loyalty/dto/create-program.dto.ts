import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateProgramDto {
  @ApiProperty({ description: 'Program name in English', example: 'Gold Rewards' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ description: 'Program name in Arabic', example: 'مكافآت ذهبية' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Program description in English' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Program description in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1.0, description: 'Points earned per 1 SAR spent' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  pointsPerCurrency?: number;

  @ApiPropertyOptional({ example: 0.05, description: 'SAR value per 1 point redeemed' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  currencyPerPoint?: number;

  @ApiPropertyOptional({ example: 365, description: 'Points expiry in days (null = never)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiryDays?: number | null;

  @ApiPropertyOptional({ example: 100, description: 'Minimum points required to redeem' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minRedeemPoints?: number;

  @ApiPropertyOptional({ example: 50, description: 'Max % of order total payable by points' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  maxRedeemPct?: number;

  @ApiPropertyOptional({ description: 'Additional program settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
