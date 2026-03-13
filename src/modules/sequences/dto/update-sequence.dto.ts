import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ResetCycle } from '@/common/enums/sequence.enums';

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
    enum: ResetCycle,
  })
  @IsOptional()
  @IsEnum(ResetCycle)
  resetCycle?: ResetCycle;

  @ApiProperty({ description: 'Current version for optimistic locking' })
  @IsInt()
  version!: number;
}
