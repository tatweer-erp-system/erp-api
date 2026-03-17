import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaxMappingDto } from './tax-mapping.dto';
import { AccountMappingDto } from './account-mapping.dto';

export class UpdateFiscalPositionDto {
  @ApiPropertyOptional({ description: 'Fiscal position name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Fiscal position name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Auto-detect based on partner country' })
  @IsOptional()
  @IsBoolean()
  autoDetect?: boolean;

  @ApiPropertyOptional({ description: 'Country for auto-detection' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Internal note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Tax mappings — replaces all existing' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxMappingDto)
  taxMappings?: TaxMappingDto[];

  @ApiPropertyOptional({ description: 'Account mappings — replaces all existing' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountMappingDto)
  accountMappings?: AccountMappingDto[];

  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @Min(0)
  version!: number;
}
