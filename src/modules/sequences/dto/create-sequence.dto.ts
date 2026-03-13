import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { SequenceEntity, ResetCycle } from '@/common/enums/sequence.enums';

export class CreateSequenceDto {
  @ApiPropertyOptional({ description: 'Branch ID (null = company-wide)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({
    description: 'Entity type for the sequence',
    enum: SequenceEntity,
  })
  @IsEnum(SequenceEntity)
  entity!: SequenceEntity;

  @ApiProperty({ description: 'Prefix for the generated number (e.g. SO, PO)', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  prefix!: string;

  @ApiPropertyOptional({ description: 'Zero-padding length (default 5)', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  padding?: number;

  @ApiPropertyOptional({
    description: 'Counter reset cycle',
    enum: ResetCycle,
    default: 'never',
  })
  @IsOptional()
  @IsEnum(ResetCycle)
  resetCycle?: ResetCycle;
}
