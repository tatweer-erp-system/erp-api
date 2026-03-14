import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsArray,
  Min,
  Matches,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'professional' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug: string;

  @ApiProperty({ description: 'Plan name in English', example: 'Professional' })
  @IsString()
  nameEn: string;

  @ApiProperty({ description: 'Plan name in Arabic', example: 'احترافي' })
  @IsString()
  nameAr: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Professional plan' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic', example: 'خطة احترافية' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ example: 299 })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ example: 2990 })
  @IsNumber()
  @Min(0)
  annualPrice: number;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: ['users', 'roles', 'hr', 'crm'] })
  @IsArray()
  @IsString({ each: true })
  modules: string[];

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ example: { email_notifications: true } })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean | string | number>;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
