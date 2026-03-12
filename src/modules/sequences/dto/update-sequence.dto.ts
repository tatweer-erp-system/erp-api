import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateSequenceDto {
  @ApiPropertyOptional({ description: 'Prefix for the generated number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefix?: string;

  @ApiPropertyOptional({ description: 'Zero-padding length', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  padding?: number;

  @ApiPropertyOptional({
    description: 'Counter reset cycle',
    enum: ['never', 'yearly', 'monthly'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['never', 'yearly', 'monthly'])
  resetCycle?: string;

  @ApiProperty({ description: 'Current version for optimistic locking' })
  @IsInt()
  version!: number;
}
