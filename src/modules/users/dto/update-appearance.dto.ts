import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppearanceTheme, AppearanceLanguage, AppearanceDensity } from '@/common/enums/user.enums';

export class UpdateAppearanceDto {
  @ApiPropertyOptional({ enum: AppearanceTheme, example: 'system' })
  @IsOptional()
  @IsEnum(AppearanceTheme)
  theme?: string;

  @ApiPropertyOptional({ example: '#1677ff' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ enum: AppearanceLanguage, example: 'en' })
  @IsOptional()
  @IsEnum(AppearanceLanguage)
  language?: string;

  @ApiPropertyOptional({ enum: AppearanceDensity, example: 'default' })
  @IsOptional()
  @IsEnum(AppearanceDensity)
  density?: string;
}
