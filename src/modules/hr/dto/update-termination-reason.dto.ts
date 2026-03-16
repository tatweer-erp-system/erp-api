import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength, IsNumber } from 'class-validator';
import { TerminationType } from '@/common/enums/definitions.enums';

export class UpdateTerminationReasonDto {
  @ApiPropertyOptional({ description: 'Termination reason in English', example: 'Resignation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Termination reason in Arabic', example: 'استقالة' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({
    description: 'Termination type',
    enum: TerminationType,
    example: TerminationType.VOLUNTARY,
  })
  @IsOptional()
  @IsEnum(TerminationType)
  type?: TerminationType;

  @ApiPropertyOptional({ description: 'Whether this reason is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
