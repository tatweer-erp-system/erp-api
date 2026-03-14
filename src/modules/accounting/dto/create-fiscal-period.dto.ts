import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { FiscalPeriodType } from '@/common/enums/accounting.enums';

export class CreateFiscalPeriodDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  fiscalYear!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(12)
  periodNumber!: number;

  @ApiPropertyOptional({ enum: FiscalPeriodType, default: FiscalPeriodType.MONTHLY })
  @IsOptional()
  @IsEnum(FiscalPeriodType)
  periodType?: FiscalPeriodType = FiscalPeriodType.MONTHLY;

  @ApiProperty({ description: 'Period name in English', example: 'January 2026' })
  @IsString()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ description: 'Period name in Arabic', example: 'يناير 2026' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  endDate!: string;
}
