import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { AdjustmentReasonType } from '@/common/enums/definitions.enums';

export class CreateAdjustmentReasonDto {
  @ApiProperty({ example: 'Damaged goods' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ example: 'بضائع تالفة' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({ enum: AdjustmentReasonType, example: AdjustmentReasonType.DECREASE })
  @IsEnum(AdjustmentReasonType)
  type!: AdjustmentReasonType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
