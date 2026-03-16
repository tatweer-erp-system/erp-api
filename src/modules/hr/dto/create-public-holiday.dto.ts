import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';

export class CreatePublicHolidayDto {
  @ApiProperty({ description: 'Holiday name in English', example: 'National Day' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Holiday name in Arabic', example: 'اليوم الوطني' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({ description: 'Holiday date', example: '2026-09-23' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Whether this holiday recurs every year', default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Whether this holiday is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
