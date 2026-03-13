import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @ApiProperty({ description: 'Section name in English' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nameEn!: string;

  @ApiProperty({ description: 'Section name in Arabic' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Section color (hex)', default: '#1D9E75' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: 'Floor number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  floorNumber?: number;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether section is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
