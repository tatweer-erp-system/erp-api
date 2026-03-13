import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Project name in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Project manager ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project budget', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Client contact ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientContactId?: string;
}
