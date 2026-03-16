import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class UpdatePublicHolidayDto {
  @ApiPropertyOptional({ description: 'Holiday name in English', example: 'National Day' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Holiday name in Arabic', example: 'اليوم الوطني' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Holiday date', example: '2026-09-23' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Whether this holiday recurs every year' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Whether this holiday is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
