import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { TerminationType } from '@/common/enums/definitions.enums';

export class CreateTerminationReasonDto {
  @ApiProperty({ description: 'Termination reason in English', example: 'Resignation' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Termination reason in Arabic', example: 'استقالة' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({
    description: 'Termination type',
    enum: TerminationType,
    example: TerminationType.VOLUNTARY,
  })
  @IsEnum(TerminationType)
  type!: TerminationType;

  @ApiPropertyOptional({ description: 'Whether this reason is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
