import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCrmStageDto {
  @ApiProperty({ description: 'Stage name in English' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Stage name in Arabic' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({ description: 'Display order sequence' })
  @IsInt()
  @Min(0)
  sequence!: number;

  @ApiPropertyOptional({ description: 'Win probability percentage (0-100)', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ description: 'Whether this stage marks a deal as won', default: false })
  @IsOptional()
  @IsBoolean()
  isWon?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this stage is folded in kanban view',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFolded?: boolean;
}
