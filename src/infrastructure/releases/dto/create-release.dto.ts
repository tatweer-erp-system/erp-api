import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsIn,
  IsArray,
  IsBoolean,
  IsOptional,
  MaxLength,
  ValidateNested,
  IsDateString,
} from 'class-validator';

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
  @ApiProperty({ enum: ['feature', 'improvement', 'fix', 'breaking'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['feature', 'improvement', 'fix', 'breaking'])
  category!: 'feature' | 'improvement' | 'fix' | 'breaking';

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

  @ApiPropertyOptional({ enum: ['top', 'bottom', 'left', 'right'] })
  @IsOptional()
  @IsString()
  @IsIn(['top', 'bottom', 'left', 'right'])
  placement?: 'top' | 'bottom' | 'left' | 'right';
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

  @ApiProperty({ enum: ['major', 'minor', 'patch', 'hotfix'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['major', 'minor', 'patch', 'hotfix'])
  type!: 'major' | 'minor' | 'patch' | 'hotfix';

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
