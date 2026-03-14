import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  MaxLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { ReleaseNoteType, TooltipPosition, ReleaseType } from '@/common/enums/release.enums';

export class ReleaseChangeDto {
  @ApiProperty({ enum: ReleaseNoteType })
  @IsNotEmpty()
  @IsEnum(ReleaseNoteType)
  type!: ReleaseNoteType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  titleEn!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  titleAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;
}

export class TourStepDto {
  @ApiProperty({ description: 'CSS selector for the target element' })
  @IsNotEmpty()
  @IsString()
  target!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  titleEn!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  titleAr!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bodyEn!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bodyAr!: string;

  @ApiPropertyOptional({ enum: TooltipPosition })
  @IsOptional()
  @IsEnum(TooltipPosition)
  placement?: TooltipPosition;
}

export class CreateReleaseDto {
  @ApiProperty({ example: '1.3.0' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: 'version must match the format X.Y.Z (e.g. 1.3.0)',
  })
  version!: string;

  @ApiProperty({ enum: ReleaseType })
  @IsNotEmpty()
  @IsEnum(ReleaseType)
  type!: ReleaseType;

  @ApiProperty({ example: 'New Dashboard Features' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  titleEn!: string;

  @ApiProperty({ example: 'ميزات لوحة التحكم الجديدة' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  titleAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ type: [ReleaseChangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleaseChangeDto)
  changes?: ReleaseChangeDto[];

  @ApiPropertyOptional({ type: [TourStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourStepDto)
  tour?: TourStepDto[];
}
