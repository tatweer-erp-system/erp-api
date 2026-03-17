import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaxMappingDto } from './tax-mapping.dto';
import { AccountMappingDto } from './account-mapping.dto';

export class CreateFiscalPositionDto {
  @ApiProperty({ description: 'Fiscal position name in English' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Fiscal position name in Arabic' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Auto-detect based on partner country', default: false })
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

  @ApiPropertyOptional({ description: 'Tax mappings (source → destination)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxMappingDto)
  taxMappings?: TaxMappingDto[];

  @ApiPropertyOptional({ description: 'Account mappings (source → destination)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountMappingDto)
  accountMappings?: AccountMappingDto[];
}
