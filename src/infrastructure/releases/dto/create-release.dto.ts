import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsOptional,
  MaxLength,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { ReleaseNoteType, TooltipPosition, ReleaseType } from '@/common/enums/release.enums';

export class LocalizedTextDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  en!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  ar!: string;
}

export class ReleaseChangeDto {
  @ApiProperty({ enum: ReleaseNoteType })
  @IsNotEmpty()
  @IsEnum(ReleaseNoteType)
  category!: ReleaseNoteType;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  text!: LocalizedTextDto;
}

export class TourStepDto {
  @ApiProperty({ description: 'CSS selector for the target element' })
  @IsNotEmpty()
  @IsString()
  target!: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title!: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description!: LocalizedTextDto;

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
  version!: string;

  @ApiProperty({ example: '2026-03-12' })
  @IsNotEmpty()
  @IsDateString()
  date!: string;

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

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  descriptionEn!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  descriptionAr!: string;

  @ApiProperty({ type: [ReleaseChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleaseChangeDto)
  changes!: ReleaseChangeDto[];

  @ApiPropertyOptional({ type: [TourStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourStepDto)
  tour?: TourStepDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
